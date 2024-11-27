import { useState, useEffect } from 'react'
import { useDAppContext } from '@/Context/dappContext'
import { useForm } from 'react-hook-form'
import { Input, Button, Modal } from '@gear-js/vara-ui';
import { useAccount, useAlert } from '@gear-js/react-hooks';
import { decodeAddress, HexString } from '@gear-js/api';
import { useSailsJs } from '@/Context';
import { CONTRACT_DATA, sponsorMnemonic, sponsorName } from '@/app/consts';
import CryptoJs from 'crypto-js';
import './SignlessForm.css';

interface Props {
    closeForm: any
}

interface FormDefaultValuesI {
    accountName: string,
    password: string
}

const DEFAULT_VALUES: FormDefaultValuesI = {
    accountName: '',
    password: ''
};


// For fast update, you can change this values
const MIN_AMOUNT_OF_BLOCKS = 2; // min amount of blocks for vouchers
const TOKENS_TO_ADD_TO_VOUCHER = 1; // tokens to add to voucher
const BLOCKS_TO_RENEW_VOUCHER = 1_200; // blocks to renew voucher if is expired (one hour)
const INITIAL_VOUCHER_TOKENS = 2; // Initial tokens for new vouchers
const INITIAL_BLOCKS_FOR_VOUCHER = 1_200; // Initial blocks for voucher (one hour)



export const SignlessForm = ({ closeForm }: Props) => {
    const {
        sails,
        generateVoucher,
        voucherIsExpired,
        renewVoucherAmountOfBlocks,
        voucherBalance,
        vouchersInContract,
        addTokensToVoucher,
        createNewKeyringPair,
        lockkeyringPair,
        unlockKeyringPair,
        modifyPairToContract,
        formatContractSignlessData
    } = useSailsJs();
    const alert = useAlert();

    const { account } = useAccount();
    const { register, handleSubmit, formState } = useForm({ defaultValues: DEFAULT_VALUES });
    const { errors } = formState;
    const { register: register2, handleSubmit: handleSubmit2, formState: formState2 } = useForm({ defaultValues: DEFAULT_VALUES });
    const { errors: errors2 } = formState2;
    
    const {
        setSignlessAccount,
        setCurrentVoucherId,
        setNoWalletSignlessAccountName
    } = useDAppContext();
    
    const [loadingAnAction, setLoadingAnAction] = useState(false);
    const [userHasWallet, setUserHasWallet] = useState(false);
    const [sectionConfirmCreationOfSignlessAccountIsOpen, setsectionConfirmCreationOfSignlessAccountIsOpen] = useState(false);
    const [noWalletAccountData, setNoWalletAccountData] = useState<FormDefaultValuesI>({ 
        accountName: '', 
        password: '',
    });

    useEffect(() => {
        if (!account) {
            setUserHasWallet(false);
        } else {
            setUserHasWallet(true);
        }
    }, [account]);


    const handleConfirmData = async () => {
        if (!sails) {
            console.error('SailsCalls is not started')
            return;
        }

        setLoadingAnAction(true);

        const encryptedName = CryptoJs.SHA256(noWalletAccountData.accountName).toString();
        const newSignlessAccount = await createNewKeyringPair(
            noWalletAccountData.accountName
        );
        const lockedSignlessAccount = lockkeyringPair(
            newSignlessAccount,
            noWalletAccountData.password
        );
        
        const formatedLockedSignlessAccount = modifyPairToContract(lockedSignlessAccount);
  
        let signlessVoucherId;

        try {
            alert.info('Will create a voucher!');
            signlessVoucherId = await generateVoucher(
                sponsorName,
                sponsorMnemonic,
                decodeAddress(newSignlessAccount.address),
                [CONTRACT_DATA.programId],
                INITIAL_VOUCHER_TOKENS, // Initial tokens in voucher
                INITIAL_BLOCKS_FOR_VOUCHER // An hour
            );
            alert.success('Voucher created!');

            setCurrentVoucherId(signlessVoucherId);
        } catch(e) {
            alert.error('Error while issue a voucher to a singless account!');
            setLoadingAnAction(false);
            return;
        }

        try {
            alert.info('Will send a message');

            const transaction = sails['PingWalletLess']
                .services
                .KeyringService
                .functions
                .BindKeyringDataToUserCodedName(
                    encryptedName, 
                    formatedLockedSignlessAccount
                );
            
            transaction.withAccount(newSignlessAccount);
            transaction.withVoucher(signlessVoucherId);

            await transaction.calculateGas();

            const { msgId, blockHash, txHash, response } = await transaction.signAndSend();

            alert.info(`Message in block: ${blockHash}`);

            const serviceResponse = await response();

            alert.success('Message send!');
        } catch(e) {
            alert.error('Error while sending signless account');
            setLoadingAnAction(false);
            return;
        }

        setSignlessAccount(newSignlessAccount);
        setCurrentVoucherId(signlessVoucherId);
        setNoWalletSignlessAccountName(encryptedName);
        setLoadingAnAction(false);
        closeForm();
    };

    const handleSubmitPassword = async ({ password }: FormDefaultValuesI) => {
        if (!account || !sails) {
            alert.error('Account or SailsCalls is not ready');
            return;
        }

        setLoadingAnAction(true);

        const contractState: any = await sails['PingWalletLess']
            .services
            .KeyringService
            .queries
            .KeyringAddressFromUserAddress(
                '0x0000000000000000000000000000000000000000000000000000000000000000', // Address zero
                undefined,
                undefined,
                account.decodedAddress
            );

        const { signlessAccountAddress } = contractState;

        if (signlessAccountAddress) {
            const contractState: any = await sails['PingWalletLess']
                .services
                .KeyringService
                .queries
                .KeyringAccountData(
                    '0x0000000000000000000000000000000000000000000000000000000000000000', // Address zero
                    undefined,
                    undefined,
                    signlessAccountAddress
                );

            const { signlessAccountData } = contractState;

            let signlessDataFromContract;

            try {
                const lockedSignlessAccount = formatContractSignlessData(
                    signlessAccountData,
                    'signlessPair'
                );
                
                signlessDataFromContract = unlockKeyringPair(
                    lockedSignlessAccount,
                    password
                );
                
            } catch(e) {
                alert.error('Incorrect password for signless account!');
                setLoadingAnAction(false);
                return;
            }

            const vouchersId = await vouchersInContract(
                decodeAddress(signlessDataFromContract.address),
                CONTRACT_DATA.programId
            );

            try {
                await checkUpdatesForVoucher(
                    decodeAddress(signlessDataFromContract.address),
                    vouchersId[0]
                );
                
            } catch(e) {
                alert.error('Error while updating signless account voucher');
                setLoadingAnAction(false);
                return;
            } 

            setSignlessAccount(signlessDataFromContract);
            setCurrentVoucherId(vouchersId[0]);
            setLoadingAnAction(false);
            closeForm();
            return;
        }

        // Signless account does not exists

        const newSignlessAccount = await createNewKeyringPair();
        const lockedSignlessAccount = lockkeyringPair(
            newSignlessAccount,
            password
        );

        const formatedLockedSignlessAccount = modifyPairToContract(
            lockedSignlessAccount
        );

        let signlessVoucherId;

        try {
            alert.info('Will create a voucher!');
            signlessVoucherId = await generateVoucher(
                sponsorName,
                sponsorMnemonic,
                decodeAddress(newSignlessAccount.address),
                [CONTRACT_DATA.programId],
                INITIAL_VOUCHER_TOKENS, // Initial tokens in voucher
                INITIAL_BLOCKS_FOR_VOUCHER // An hour
            );
            alert.success('Voucher created!');

            setCurrentVoucherId(signlessVoucherId);
        } catch(e) {
            alert.error('Error while issue a voucher to a singless account!');
            setLoadingAnAction(false);
            return;
        }

        try {
            alert.info('Will send a message');

            const transaction = sails['PingWalletLess']
                .services
                .KeyringService
                .functions
                .BindKeyringDataToUserAddress(
                    account.decodedAddress,
                    formatedLockedSignlessAccount
                );
            
            transaction.withAccount(newSignlessAccount);
            transaction.withVoucher(signlessVoucherId);

            await transaction.calculateGas();

            const { msgId, blockHash, txHash, response } = await transaction.signAndSend();

            alert.info(`Message in block: ${blockHash}`);

            const serviceResponse = await response();

            alert.success('Message send!');

        } catch(e) {
            alert.error('Error while sending signless account');
            setLoadingAnAction(false);
            return;
        }

        setSignlessAccount(newSignlessAccount);
        setCurrentVoucherId(signlessVoucherId);

        setLoadingAnAction(false);
        closeForm();
    }

    const handleSubmitNoWalletSignless = async ({accountName, password}: FormDefaultValuesI) => {
        if (!sails) {
            alert.error('SailsCalls is not ready');
            return;
        }

        setLoadingAnAction(true);

        const encryptedName = CryptoJs.SHA256(accountName).toString();

        let contractState: any = await sails['PingWalletLess']
            .services
            .KeyringService
            .queries
            .KeyringAddressFromUserCodedName(
                '0x0000000000000000000000000000000000000000000000000000000000000000', // Address zero
                undefined,
                undefined,
                encryptedName
            );

        const { signlessAccountAddress } = contractState;

        if (!signlessAccountAddress) {
            setsectionConfirmCreationOfSignlessAccountIsOpen(true);
            setLoadingAnAction(false);
            return;
        }

        contractState = await sails['PingWalletLess']
            .services
            .KeyringService
            .queries
            .KeyringAccountData(
                '0x0000000000000000000000000000000000000000000000000000000000000000', // Address zero
                undefined,
                undefined,
                signlessAccountAddress
            );

        const { signlessAccountData } = contractState;

        let signlessDataFromContract;

        try {
            const lockedSignlessData = formatContractSignlessData(
                signlessAccountData,
                accountName
            );

            signlessDataFromContract = unlockKeyringPair(
                lockedSignlessData,
                password
            );
      
        } catch(e) {
            alert.error('Incorrect password for signless account!');
            console.error(e);
            setLoadingAnAction(false);
            return;
        }
        const decodedSignlessAddress = decodeAddress(signlessDataFromContract.address);
        const vouchersId = await vouchersInContract(
            decodedSignlessAddress,
            CONTRACT_DATA.programId
        );

        await checkUpdatesForVoucher(
            decodedSignlessAddress,
            vouchersId[0]
        );

        setSignlessAccount(signlessDataFromContract);
        setCurrentVoucherId(vouchersId[0]);
        setNoWalletSignlessAccountName(encryptedName);
        setLoadingAnAction(false);
        closeForm();
    };

    const checkUpdatesForVoucher = (address: HexString, voucherId: HexString): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            if (!sails) {
                alert.error();
                reject('SailsCalls is not started');
                return;
            }

            try {
                // Check the voucher to renew it
                const isExpired = await voucherIsExpired(
                    address,
                    voucherId
                );

                // If expired, need to renew the voucher
                if (isExpired) {
                    alert.info('Will renew the voucher');
                    await renewVoucherAmountOfBlocks(
                        sponsorName,
                        sponsorMnemonic,
                        address,
                        voucherId,
                        BLOCKS_TO_RENEW_VOUCHER // An hour
                    );
                    alert.success('voucher renewed!');
                }

                // Check if the voucher needs tokens
                const totalVoucherBalance = await voucherBalance(
                    voucherId
                );

                // Check if the voucher balance has less than 2 tokens
                if (totalVoucherBalance < MIN_AMOUNT_OF_BLOCKS) {
                    alert.info('Will add tokens to voucher');
                    await addTokensToVoucher(
                        sponsorName,
                        sponsorMnemonic,
                        address,
                        voucherId,
                        TOKENS_TO_ADD_TO_VOUCHER
                    );
                    alert.success('Tokens added in voucher');
                }

                resolve();
            } catch(e) {
                alert.error('Error while updating signless account voucher');
                reject(e);
                return;
            } 
        });
    }

    const formWithWallet = () => {
        return (
            <form onSubmit={handleSubmit2(handleSubmitPassword)} className='signless-form--form'>
                <Input 
                    className='signless-form__input'
                    type='password'
                    label='Set password'
                    error={errors2.password?.message}
                    {
                        ...register2(
                            'password',
                            {
                                required: 'Field is required',
                                minLength: {
                                    value: 10,
                                    message: 'Minimum length is 10'
                                }
                            }
                        )
                    }
                />
                <Button
                    className='signless-form__button'
                    type='submit'
                    block={true}
                    isLoading={loadingAnAction}
                >
                    Submit
                </Button>
                {
                    !sectionConfirmCreationOfSignlessAccountIsOpen &&  <Button
                        className='signless-form__button'
                        color='light'
                        block={true}
                        onClick={closeForm}
                        isLoading={loadingAnAction}
                    >
                        Cancel
                    </Button>
                }
            </form>
        );
    }

    const formWithoutWallet = () => {
        return (
            <form 
                onSubmit={
                    handleSubmit(
                        !sectionConfirmCreationOfSignlessAccountIsOpen
                        ? handleSubmitNoWalletSignless
                        : handleConfirmData
                    )
                } 
                className='signless-form--form'
            >
                {
                    !sectionConfirmCreationOfSignlessAccountIsOpen && <>
                        <Input 
                            className='signless-form__input'
                            type='account name'
                            label='Set name'
                            error={errors.password?.message}
                            {
                                ...register(
                                    'accountName',
                                    {
                                        required: 'Field is required',
                                        minLength: {
                                            value: 10,
                                            message: 'Minimum length is 10'
                                        }
                                    }
                                )
                            }
                            onChange={(e) => {
                                setNoWalletAccountData({
                                    ...noWalletAccountData,
                                    accountName: e.target.value
                                });
                            }}
                            value={noWalletAccountData.accountName}
                        />
                        <Input 
                            className='signless-form__input'
                            type='password'
                            label='Set password'
                            error={errors.password?.message}
                            {
                                ...register(
                                    'password',
                                    {
                                        required: 'Field is required',
                                        minLength: {
                                            value: 10,
                                            message: 'Minimum length is 10'
                                        }
                                    }
                                )
                            }
                            onChange={(e) => {
                                setNoWalletAccountData({
                                    ...noWalletAccountData,
                                    password: e.target.value
                                });
                            }}
                            value={noWalletAccountData.password}
                        />
                    </>
                }

                {
                    sectionConfirmCreationOfSignlessAccountIsOpen &&
                    <p 
                        style={{
                            width: '280px',
                            textAlign: 'center',
                            marginBottom: '10px'
                        }}
                    >
                        The account does not have a signless account, do you want to create one?
                    </p>
                }
                
                <Button 
                    className='signless-form__button'
                    type='submit'
                    block={true}
                    isLoading={loadingAnAction}
                >
                    {
                        !sectionConfirmCreationOfSignlessAccountIsOpen
                        ? 'Submit'
                        : "Create"
                    }
                </Button>

                {
                    sectionConfirmCreationOfSignlessAccountIsOpen &&  <Button
                        className='signless-form__button'
                        color='grey'
                        block={true}
                        onClick={() => setsectionConfirmCreationOfSignlessAccountIsOpen(false)}
                        isLoading={loadingAnAction}
                    >
                        Cancel
                    </Button>
                }
                {
                    !sectionConfirmCreationOfSignlessAccountIsOpen &&  <Button
                        className='signless-form__button'
                        color='grey'
                        block={true}
                        onClick={closeForm}
                        isLoading={loadingAnAction}
                    >
                        Cancel
                    </Button>
                }
            </form>
        );
    }

    return <Modal
            heading='Signless Form'
            close={
                !loadingAnAction
                 ? closeForm
                 : () => console.log('Cant close modal while an action is active!')
            }
        >
            <div className='signless-form'>
                { userHasWallet ? formWithWallet() : formWithoutWallet() }   
            </div>
        </Modal>
}

