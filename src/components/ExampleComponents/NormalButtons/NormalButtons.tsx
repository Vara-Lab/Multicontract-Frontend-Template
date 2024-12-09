import { Button } from '@gear-js/vara-ui';
import { useAlert } from '@gear-js/react-hooks';
import { useSailsUtils } from '@/app/hooks';
import { CONTRACT_DATA } from '@/app/consts';
import '../ButtonsContainer.css';

export const NormalButtons = () => {
    const { sails } = useSailsUtils();
    const alert = useAlert();

    const sendMessageWithMethod = async (method: string) => {
        try {
            alert.info('Will send a message');

            // account not specified, will use the actual selected account
            const result = await sails.sendCommand({
                contractId: CONTRACT_DATA.programId,
                idl: CONTRACT_DATA.idl,
                serviceName: "Ping",
                methodName: method
            });

            const { msgId, blockHash, txHash, response } = result;

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
