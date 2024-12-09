import { useState } from 'react'
import { Button } from '@gear-js/vara-ui';
import { useAccount, useAlert } from '@gear-js/react-hooks';
import { useDAppContext } from '@/Context/dappContext';
import { SignlessForm } from '../../SignlessForm/SignlessForm';
import { decodeAddress } from '@gear-js/api';
import { CONTRACT_DATA, sponsorMnemonic, sponsorName } from '@/app/consts';
import { useMulticontractSails } from '@/app/hooks';
import '../ButtonsContainer.css';

export const SignlessButtons = () => {
    const {
        sails,
        voucherUtils,
        signlessUtils
    } = useMulticontractSails();
    const {
        voucherIsExpired,
        renewVoucherAmountOfBlocks,
        voucherBalance,
        addTokensToVoucher
    } = voucherUtils;
    const alert = useAlert();

    const { account } = useAccount();
    const { 
        currentVoucherId,
        signlessAccount,
        noWalletSignlessAccountName,
    } = useDAppContext();

    const [userFillingTheForm, setUserFillingTheForm] = useState(false);

    const sendMessageWithPayload = async (method: string, payload: any) => {
        if (!signlessAccount) {
            alert.error('no signless account!');
            return
        }

        if (!currentVoucherId) {
            alert.error('No voucher for sigless account!');
            return;
        }

        try {
            // Check the voucher to renew it
            const isExpired = await voucherIsExpired(
                decodeAddress(signlessAccount.address),
                currentVoucherId
            );

            // If expired, need to renew the voucher
            if (isExpired) {
                alert.info('Will renew the voucher');
                await renewVoucherAmountOfBlocks(
                    sponsorName,
                    sponsorMnemonic,
                    decodeAddress(signlessAccount.address),
                    currentVoucherId,
                    1_200 // An hour
                );
                alert.success('voucher renewed!');
            }

            const totalVoucherBalance = await voucherBalance(
                currentVoucherId
            );

            // Check if the voucher balance has less than 2 tokens
            if (totalVoucherBalance < 2) {
                alert.info('Will add tokens to voucher');
                await addTokensToVoucher(
                    sponsorName,
                    sponsorMnemonic,
                    decodeAddress(signlessAccount.address),
                    currentVoucherId,
                    1
                );
                alert.success('Tokens added in voucher');
            }

        } catch(e) {
            alert.error('Error while updating signless account voucher');
            return;
        }

        try {
            alert.info('Will send a message');

            // account not specified, will use the actual selected account
            const result = await sails.sendCommand({
                contractId: CONTRACT_DATA.programId,
                idl: CONTRACT_DATA.idl,
                serviceName: 'Ping',
                methodName: method,
                account: signlessAccount,
                voucherId: currentVoucherId,
                args: [
                    payload
                ]
            })

            const { msgId, blockHash, txHash, response } = result;

            alert.info(`Message in block: ${blockHash}`);

            const serviceResponse = await response();

            alert.success('Message send !');
       
            console.log("Response: ", Object.keys(serviceResponse as {})[0]);
        } catch (e) {
            alert.error('Error while sending signless account');
            return;
        }
    }

    return (
        <div className='buttons-container'>
            <Button 
                isLoading={userFillingTheForm}
                onClick={async () => {
                    if (!signlessAccount) {
                        setUserFillingTheForm(true);
                        return;
                    }
                    
                    if (account) {
                        await sendMessageWithPayload(
                            'PingSignless',
                            account.decodedAddress
                        );
                    } else {
                        await sendMessageWithPayload(
                            'PingNoWallet',
                            noWalletSignlessAccountName
                        );
                    }
                }}
            >
                Send Ping with signless account
            </Button>
            <Button 
                isLoading={userFillingTheForm}
                onClick={async () => {
                    if (!signlessAccount) {
                        setUserFillingTheForm(true);
                        return;
                    }

                    if (account) {
                        await sendMessageWithPayload(
                            'PongSignless',
                            account.decodedAddress
                        );
                    } else {
                        await sendMessageWithPayload(
                            'PongNoWallet',
                            noWalletSignlessAccountName
                        );
                    }
                }}
            >
                Send Pong with signless account
            </Button>
            {
                userFillingTheForm && 
                <SignlessForm closeForm={() => {
                    setUserFillingTheForm(false);
                }}/>
            }
        </div>
    )
}
