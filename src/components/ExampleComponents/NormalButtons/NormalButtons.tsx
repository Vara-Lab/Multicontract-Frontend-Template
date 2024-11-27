import { Button } from '@gear-js/vara-ui';
import { useAccount, useAlert } from '@gear-js/react-hooks';
import { useSailsJs } from '@/Context';
import { web3FromSource } from '@polkadot/extension-dapp';
import '../ButtonsContainer.css';

export const NormalButtons = () => {
    const { account } = useAccount();
    const {
        sails,
    } = useSailsJs();
    const alert = useAlert();

    const sendMessageWithMethod = async (method: string) => {
        if (!sails) {
            alert.error('SailsCalls is not started!');
            return;
        }

        if (!account) {
            alert.error('Account is not ready');
            return;
        }

        const { signer } = await web3FromSource(account.meta.source);

        try {
            alert.info('Will send a message');

            const transaction = sails['PingWalletLess']
                .services
                .Ping
                .functions[method]();

            transaction.withAccount(account.decodedAddress, { signer });
            await transaction.calculateGas();

            const { msgId, blockHash, txHash, response } = await transaction.signAndSend();

            alert.info(`Message in block: ${blockHash}`);

            const serviceResponse = await response();

            alert.success('Message send !');

            console.log("Response: ", Object.keys(serviceResponse as {})[0]);
        } catch (e) {
            alert.error('Error while sending message!');
            console.error(e);
        }
    }

    return (
        <div className='buttons-container'>
            <Button onClick={async () => {
                await sendMessageWithMethod('Ping');
            }}>
                Send Ping
            </Button>
            <Button onClick={async () => {
                await sendMessageWithMethod('Pong');
            }}>
                Send Pong
            </Button>
        </div>
    )
}
