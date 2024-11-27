import { useState } from 'react'
import { Button } from '@gear-js/vara-ui';
import { useAccount, useAlert } from '@gear-js/react-hooks';
import { useDAppContext } from '@/Context/dappContext';
import { SignlessForm } from '../../SignlessForm/SignlessForm';
import { decodeAddress } from '@gear-js/api';
import { useSailsJs } from '@/Context';
import { sponsorMnemonic, sponsorName } from '@/app/consts';
import '../ButtonsContainer.css';

export const SignlessButtons = () => {
    const {
        sails,
        voucherIsExpired,
        renewVoucherAmountOfBlocks,
        voucherBalance,
        addTokensToVoucher
    } = useSailsJs();
    const alert = useAlert();

    const { account } = useAccount();
    const { 
        currentVoucherId,
        signlessAccount,
        noWalletSignlessAccountName,
    } = useDAppContext();

    const [userFillingTheForm, setUserFillingTheForm] = useState(false);

    const sendMessageWithPayload = async (method: string, payload: any) => {
        console.log(currentVoucherId);
        
        if (!sails) {
            alert.error('SailsCalls is not started!');
            return;
        }

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

            const transaction = sails['PingWalletLess']
                .services
                .Ping
                .functions[method](payload);

            transaction.withAccount(signlessAccount);
            transaction.withVoucher(currentVoucherId);
            await transaction.calculateGas();

            const { msgId, blockHash, txHash, response } = await transaction.signAndSend();

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
