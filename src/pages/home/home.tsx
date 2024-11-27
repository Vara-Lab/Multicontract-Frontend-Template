import { useEffect, useState } from 'react';
import { useContext } from 'react';
import { dAppContext } from '@/Context/dappContext';
import { Button } from '@gear-js/vara-ui';
import { useAccount } from '@gear-js/react-hooks';
import { 
    NormalButtons,
    VoucherButtons,
    SignlessButtons,
} from '@/components/ExampleComponents';
import { useSailsJs } from '@/Context';
import "./examples.css";


function Home () {
    const { sails } = useSailsJs();
    const { account } = useAccount();
    const { 
        currentVoucherId,
        setCurrentVoucherId,
        setSignlessAccount
    } = useContext(dAppContext);

    const [pageSignlessMode, setPageSignlessMode] = useState(false);
    const [voucherModeInPolkadotAccount, setVoucherModeInPolkadotAccount] = useState(false);
    const [contractState, setContractState] = useState("");

    useEffect(() => {
        if (!account) {
            setPageSignlessMode(true);
        } else {
            setPageSignlessMode(false);
        }
        if (setCurrentVoucherId) setCurrentVoucherId(null)
    }, [account]);

    return (
        <div className='examples-container'>
            
            <div className='examples'>
                <div className='information'>
                    <p>
                        signless mode: { pageSignlessMode ? "Activated" : "disabled" }
                    </p>
                    <p>
                        voucher active: { currentVoucherId ? "true" : "false" }
                    </p>
                    <p
                        style={{
                            maxWidth: "300px"
                        }}
                    >
                        state: {contractState}
                    </p>
                </div>
                <Button onClick={async () => {
                    if (!sails) {
                        console.log('No esta lsita el account o sails');
                        return;
                    }

                    const response = await sails['PingWalletLess']
                        .services
                        .Ping
                        .queries
                        .LastCaller(
                            '0x0000000000000000000000000000000000000000000000000000000000000000' // Address zero
                        );


                    setContractState("Last who call: " + JSON.stringify(response));
                }}>
                    Read State
                </Button>
                <Button onClick={() => {
                    if (setCurrentVoucherId) setCurrentVoucherId(null);
                    if (setSignlessAccount) setSignlessAccount(null);
                    setPageSignlessMode(!pageSignlessMode);
                }}>
                    toggle signless mode
                </Button>
                {
                    !pageSignlessMode && (
                        <Button onClick={() => {
                            setVoucherModeInPolkadotAccount(!voucherModeInPolkadotAccount);
                        }}>
                            toggle voucher mode
                        </Button>
                    )
                }

                {
                    !pageSignlessMode && !voucherModeInPolkadotAccount && (
                        <NormalButtons />
                    )
                }

                {
                    pageSignlessMode && <SignlessButtons />
                }

                {
                    !pageSignlessMode && voucherModeInPolkadotAccount && (
                        <VoucherButtons />
                    )
                }
            </div>
        </div>
    );
}

export {Home };
