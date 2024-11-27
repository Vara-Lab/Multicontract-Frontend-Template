# Vite-Template

To install the dependencies you put "yarn" in the console, and to run it you use "yarn start"

In order to use the example, the following must be followed:

1. First you need to have the name and mnemonic of the wallet (account) which will pay for the creation of vouchers, etc.
2. In the file within "src/app/consts.ts", you will have to put the data obtained from the account that will cover the payments.
3. The information will have to be put on lines 25 and 26:

```javascript
export const sponsorName = "";
export const sponsorMnemonic = "";
```

> Note: The template contains a sponsor example that contains tokens, for your dApp, you need to put a sponsor name and a sponsor mnemonic

4. With this, you can now use the example in the template.
5. You can try the frontend template on gitpod!

<p align="center">
  <a href="https://gitpod.io/#https://github.com/Vara-Lab/Chackra-UI-Vite-Sails-Template.git" target="_blank">
    <img src="https://gitpod.io/button/open-in-gitpod.svg" width="240" alt="Gitpod">
  </a>
</p>

## Provider

The template has a provider which is `sailsJsContext`, which will provide the context of sails (the template already use it), and useful hooks to be able to use sails with the multi contract feature. It is located in `src/Context/sailsJsContext.tsx`

## Sails instances

### Initialization and usage

The provider will provide an object which has different instances of Sails, which will use the same instances of the GearApi and the Parser, each instance can be used by putting the name that was assigned to each contract (in the initialization hook), initialization and usage example:

- Initialization: 
```javascript
// code ...
import { useInitSailsJs } from "./app/hooks";

const App = () => {
  const { sailsIsReady } = useInitSailsJs({
    contractsData: [
      {
        contractName: 'PingWalletLess',
        contractId: '0x...', // Program id stored in a constant
        idl: `...` // idl stored in a constant
      },
      {
        contractName: 'TrafficLightContract',
        contractId: '0x...',
        idl: `...`
      },
      {
        ... // Other contract
      },
      ... // More contracts data
    ],
    network: 'wss://testnet.vara.network' // set the network
  });

  // code ...
}
```

- Use of instances:

```javascript
// code ..
import { useSailsJs } from '@/Context';

const MyComponent = () => {
  const {
      sails, // Object to use all Sails instances
  } = useSailsJs();

  // code ...
}
```

### Commands and queries

When calling a contract to make a command or a query, it is the same as [Sails-js](https://github.com/gear-tech/sails/tree/master/js) does, with the difference that you choose which contract you will send the message to or read the status to.

- Examples:

  ```javascript
  // Sending a message with voucher to TrafficLightContract

  const { signer } = await web3FromSource(account.meta.source);

  //PingWalletLess
  const transaction = sails['TrafficLightContract']
    .services
    .TrafficLight
    .functions
    .Green();

  transaction.withAccount(account.decodedAddress, { signer });
  transaction.withVoucher(voucherIdToUse);

  await transaction.calculateGas();

  const { msgId, blockHash, txHash, response } = await transaction.signAndSend();

  ```
  ``` javascript
  // Sending a message with voucher to 

  const { signer } = await web3FromSource(account.meta.source);

  const transaction = sails['PingWalletLess']
    .services
    .Ping
    .functions
    .Ping();

  transaction.withAccount(account.decodedAddress, { signer });
  transaction.withVoucher(voucherIdToUse);

  await transaction.calculateGas();

  const { msgId, blockHash, txHash, response } = await transaction.signAndSend();
  ```
  ```javascript
  // Reading state query with zero address

  const response = await sails['PingWalletLess']
    .services
    .Ping
    .queries
    .LastCaller(
        // Address zero
        '0x0000000000000000000000000000000000000000000000000000000000000000' 
    );
  ```

## Hooks

Hooks that you can use, this template already use all hooks and util functions (in `src/components/ExampleComponents` and `src/components/SignlessForm`).

- useInitSailsJs: Hook that will initialize the context with a new instance of sails with contracts data, you need to set  all the contracts that you will use  and the network, it will returns a constant that says if sails is ready, and then, you will be able to send messages and read state from the contracts that you specify in the hook, example:

  ```javascript
  const { sailsIsReady } = useInitSailsJs({
    contractsData: [
      {
        contractName: 'PingWalletLess',
        contractId: CONTRACT_DATA.programId, // Program id stored in a constant
        idl: CONTRACT_DATA.idl // idl stored in a constant
      },
      {
        // data from a contract in testnet
        contractName: 'TrafficLightContract',
        contractId: '0xb98e86df34b23b6cf5b64074bc82c7323de9ebbf13bfeec5aca4c3e513fcc932',
        idl: `
          type TrafficLightEvent = enum {
            Green,
            Yellow,
            Red,
          };

          type IoTrafficLightState = struct {
            current_light: str,
            all_users: vec struct { actor_id, str },
          };

          constructor {
            New : ();
          };

          service TrafficLight {
            Green : () -> TrafficLightEvent;
            Red : () -> TrafficLightEvent;
            Yellow : () -> TrafficLightEvent;
            query TrafficLight : () -> IoTrafficLightState;
          };
        `
      },
      {
        ... // Other contract
      },
      ... // More contracts data
    ],
    network: 'wss://testnet.vara.network' // set the network
  });
  ```

- useSailsJs: Main hook which will return the sails instance (null if not initialized) along with useful functions. How to use it:

  ```javascript
  const {
        sails, // sails instance to use with multiple contracts
        generateVoucher,
        voucherIsExpired,
        renewVoucherAmountOfBlocks,
        voucherBalance,
        vouchersInContract,
        addTokensToVoucher,
        ... // Rest of the functions
    } = useSailsJs();
  ```

  Functions in `useSailsJs` hook:

  + generateVoucher: This function generates a new voucher for a user and returns the voucher id, example:

    ```javascript
    const newVoucherId = await generateVoucher(
      'sponsor name', // Username from the sponsor wallet account
      'sponsor mnemonic', // mnemonic from your wallet, it will sign and pay the tokens for the voucher
      '0x...', // Address to set the voucher (user address)
      ['0x...', ...], // Contracts id to bind the voucher
      2, // Initial amount of tokens in voucher (two tokens),
      1_200 // Initial amount of blocks for voucher (one hour)
    );
    ```
    
  + vouchersInContract: This function will give you the vouchers of a user (vouchers id array) affiliated with a contract. You need to set the user address and the contract id, example:
    
    ```javascript
    const vouchersForAddress = await vouchersInContract(
        '0x...', // user address
        '0x...' // Contract id
    );

    console.log('Vouchers from user address and contract id:');
    console.log(vouchersForAddress);
    ```

  + voucherIsExpired: this function will return a boolean, if true, the voucher is expired, you need to set the user address that is owner of the voucher, and the voucher id, example:

    ```javascript
    const isExpired = await voucherIsExpired(
        '0x...', // user address
        '0x...' // voucher id
    );

    if (isExpired) {
      console.log('The voucher is expired');
    }
    ```

  + renewVoucherAmountOfBlocks: This functions helps to renew the specified voucher with the amount of blocks that you specified, example:
    ```javascript
    if (isExpired) {
        await renewVoucherAmountOfBlocks(
            'sponsor name', //Username from the sponsor wallet account
            'sponsor mnemonic', // mnemonic from your wallet, it will sign and pay the tokens for the voucher
            '0x...', // User address
            '0x...', // voucher id
            1_200 // amount of blocks to renew the voucher (one hour)
        );
    }
    ```

  + voucherBalance: This function gives the balance from a voucher by given its voucher id (needs a valid voucher id), example:

    ```javascript
    const totalVoucherBalance = await voucherBalance(
        voucherId
    ); 

    console.log(`Voucher balance ${totalVoucherBalance}`);
    ```
 
  + addTokensToVoucher: This function adds tokens to a voucher, this from a sponsor, giving the voucher id, example:

    ```javascript
    await addTokensToVoucher(
        'sponsor name', //Username from the sponsor wallet account
        'sponsor mnemonic', // mnemonic from your wallet, it will sign and pay the tokens for the voucher
        '0x...', // User address
        '0x...', // voucher id
        1 // tokens to add 
    );
    ```

  + createNewKeyringPair: This function will create a new keyringpair, example:

    ```javascript
    const newSignlessAccount = await createNewKeyringPair(
      'signless account name' // if not provided, will use 'signlessPair'
    );
    ```

  + lockkeyringPair: This function locks a keyring pair account by giving a password, example:

    ```javascript
    const lockedSignlessAccount = lockkeyringPair(
        newSignlessAccount, // keyring pair to lock
        'password' // password to lock the keyring pair account
    );
    ```

  + unlockKeyringPair: Function to unlock a keyring pair account by giving the password with which the account was previously blocked, example:

    ```javascript
    const unlockedKeyringPair = unlockKeyringPair(
        lockedSignlessAccount,
        'password' // if the password is wrong, it will throw an error
    );
    ```

  + modifyPairToContract: Function that helps to correctly format a locked keyring pair account to send it to the contract, this function is used in case of using the signless or walletless feature in the contract, example:

    ```javascript
    const modifiedLockedKeyringPair = modifyPairToContract(lockedSignlessAccount);
    ```

  + formatContractSignlessData: Function that correctly formats a blocked account that had been modified to be sent to the contract, it is used in case of using the signless or walletless feature in the contract, example:

    ```javascript
    const lockedKeyringAccount = formatContractSignlessData(
        signlessAccountData,
        accountName
    );
    ```
