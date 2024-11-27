import { useAccount, useApi } from "@gear-js/react-hooks";
import { ApiLoader } from "@/components";
import { Header } from "@/components/layout";
import { withProviders } from "@/app/hocs";
import { useEnableWeb3 } from "./app/hooks";
import { Routing } from "./pages";
import { useInitSailsJs } from "./app/hooks";
import { CONTRACT_DATA } from "./app/consts";
import "@gear-js/vara-ui/dist/style.css";

function Component() {
  const { isApiReady } = useApi();
  const { isAccountReady } = useAccount();
  const { web3IsEnable } = useEnableWeb3();
  const { sailsIsReady } = useInitSailsJs({
    contractsData: [
      {
        contractName: 'PingWalletLess',
        contractId: CONTRACT_DATA.programId,
        idl: CONTRACT_DATA.idl
      },
      // you can add more contracts data to use
    ],
    network: 'wss://testnet.vara.network'
  })

  const isAppReady = isApiReady && isAccountReady && web3IsEnable && sailsIsReady;

  return (
    <>
      <Header isAccountVisible={isAccountReady} />
      {isAppReady ? <Routing /> : <ApiLoader />}
    </>
  );
}

export const App = withProviders(Component);
