import { Button } from '@gear-js/vara-ui';
import { useAccount, useAlert } from '@gear-js/react-hooks';
import { useDAppContext } from '@/Context/dappContext';
import { HexString } from '@gear-js/api';
import { web3FromSource } from '@polkadot/extension-dapp';
import { useSailsUtils } from '@/app/hooks';
import { CONTRACT_DATA, sponsorMnemonic, sponsorName } from '@/app/consts';
import '../ButtonsContainer.css';

export const VoucherButtons = () => {
    const { account } = useAccount();
    const {
        currentVoucherId,
        setCurrentVoucherId
    } = useDAppContext();
    const {
        sails,
        voucherUtils
    } = useSailsUtils();
    const {
        generateVoucher,
        voucherIsExpired,
        renewVoucherAmountOfBlocks,
        voucherBalance,
        vouchersInContract,
        addTokensToVoucher
    } = voucherUtils;
    const alert = useAlert();

    const manageVoucherId = async (voucherId: HexString): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            if (!account) {
                alert.error('Account is not ready');
                reject('Account is not ready');
                return;
            }

            try {
                // Check the voucher to renew it
                const isExpired = await voucherIsExpired(
                    account.decodedAddress,
                    voucherId
                );

                // If expired, need to renew the voucher
                if (isExpired) {
                    alert.info('Will renew the voucher');
                    await renewVoucherAmountOfBlocks(
                        sponsorName,
                        sponsorMnemonic,
                        account.decodedAddress,
                        voucherId,
                        1_200 // An hour
                    );
                    alert.success('voucher renewed!');
                }

                // Check if the voucher needs tokens
                const totalVoucherBalance = await voucherBalance(
                    voucherId
                );

                // Check if the voucher balance has less than 2 tokens
                if (totalVoucherBalance < 2) {
                    alert.info('Will add tokens to voucher');
                    await addTokensToVoucher(
                        sponsorName,
                        sponsorMnemonic,
                        account.decodedAddress,
                        voucherId,
                        1
                    );
                    alert.success('Tokens added in voucher');
                }

                resolve();
            } catch (e) {
                alert.error('Error while check voucher');
                reject(e);
            }
        });
    }

    const sendMessageWithMethodAndVoucher = async (method: string) => {
        if (!account) {
            alert.error('Account is not ready');
            return;
        }

        let voucherIdToUse;
                
        if (!currentVoucherId) {
            const vouchersForAddress = await vouchersInContract(
                account.decodedAddress,
                CONTRACT_DATA.programId
            );

            if (vouchersForAddress.length === 0) {
                alert.info('Will create a voucher!');
                voucherIdToUse = await generateVoucher(
                    sponsorName,
                    sponsorMnemonic,
                    account.decodedAddress,
                    [CONTRACT_DATA.programId],
                    2, // Initial tokens in voucher
                    1_200 // An hour
                );
                alert.success('Voucher created!');
            } else {
                voucherIdToUse = vouchersForAddress[0];
                setCurrentVoucherId(voucherIdToUse);

                await manageVoucherId(voucherIdToUse);
            }
        } else {
            await manageVoucherId(currentVoucherId);
            voucherIdToUse = currentVoucherId;
        }

        const { signer } = await web3FromSource(account.meta.source);

        try {
            alert.info('Will send a message');

            // account not specified, will use the actual selected account
            const result = await sails.sendCommand({
                contractId: CONTRACT_DATA.programId,
                idl: CONTRACT_DATA.idl,
                serviceName: 'Ping',
                methodName: method,
                voucherId: voucherIdToUse
            })


            const { msgId, blockHash, txHash, response } = result;

            alert.info(`Message in block: ${blockHash}`);

            const serviceResponse = await response();

            alert.success('Message send!');

            console.log(`Response: ${Object.keys(serviceResponse as {})[0]}`);
        } catch (e) {
            alert.error('Error while sending message');
            console.error(e);
        }
    }

    return (
        <div className='buttons-container'>
            <Button onClick={async () => {
                await sendMessageWithMethodAndVoucher('Ping');
            }}>
                Send Ping with voucher
            </Button>
            <Button onClick={async () => {
                await sendMessageWithMethodAndVoucher('Pong');
            }}>
                Send Pong with voucher
            </Button>
        </div>
    )
}
