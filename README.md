# Vite-Template

To install the dependencies you put "yarn" in the console, and to run it you use "yarn start"

In order to use the example, the following must be followed:

1. First you need to have the name and mnemonic of the wallet (account) which will pay for the creation of vouchers, etc.
2. In the file within "src/app/consts.ts", you will have to put the data obtained from the account that will cover the payments.
3. The information will have to be put on lines 25 and 26 (it already contains the mnemonic information from an account, ):

```javascript
export const sponsorName = "";
export const sponsorMnemonic = "";
```

> Note: The template contains a sponsor example that contains tokens, for your dApp, It is recommended that you put your mnemonic and name data.

4. With this, you can now use the example in the template.
5. You can try the frontend template on gitpod!

<p align="center">
  <a href="https://gitpod.io/#https://github.com/Vara-Lab/Multicontract-Frontend-Template.git" target="_blank">
    <img src="https://gitpod.io/button/open-in-gitpod.svg" width="240" alt="Gitpod">
  </a>
</p>

## Hook

The template has a custom hook which gives you all the necessary functions to be able to send messages, queries, create vouchers, keyring accounts, etc. Provides three literal objects:

- `sails`: This literal object contains two functions:
  - `sendCommand`: This function will send a message to a contract given its id, idl, the service and methods to call. Examples:

    ```jsx
    import { useSailsUtils } from '@/app/hooks';

    const SendTransaction = () => {
      const { sails } = useSailsUtils();

      const handleClick = async () => {
        const result = await sails.sendCommand({
            contractId: '0x..',
            idl: `...`, // Contract idl
            serviceName: 'Service',
            methodName: 'Function',
            // additional options:
            account: ...,  // if not provided, connected account from extension will be used by default, this use an Account or KeyringPair types
            value: 1_000_000_000_000n, // if not provided, 0 is sent by default
            gasLimit: 1000000000n, // if not provided, gas will be calculated automatically,
            voucherId: '0x...', // if not provided, transaction will be sent without voucher
            args: ['arg1', 'argument2'] // If not provided, no argument will be sent
        });

        const response = await result.response();

        console.log('response: ': response);
      }

      return (
        <button type="button" onClick={handleClick}>
          Send Transaction
        </button>
      );
    } 
    ```

  - `sendQuery`: This function will send a message to a contract given its id, idl, the service and methods to call, it read the state with the specified query. Example:

    ```jsx
    import { useState } from 'react';
    import { useSailsUtils } from '@/app/hooks';

    const State = () => {
      const { sails } = useSailsUtils();
      const [contractState, setContractState] = useState("");

      const handleClick = async () => {
        const response = await sails.sendQuery({
            contractId: '0x...',
            idl: `...`, // Contract idl
            serviceName: 'Service',
            methodName: 'Function',
            // additional options
            userAddress: '0x...', // If not provided, zero address will be sent
            args: ['arg1', 'argument2'] // If not provided, no argument will be sent
        });

        setContractState(JSON.stringify(response));
      }

      return (
        <>
          <div>
            { contractState }
          </div>
          <button type="button" onClick={handleClick}>
            Read State
          </button>
        </>
      );
    } 
    ```

- `voucherUtils`: This literal object contains six functions, you can get this functions like this:

  ```jsx
    const {
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
  ```

  Each function is used independently like this:

  - `generateVoucher`: This function will create a new voucher to an user address and returns the voucher id (needs the mnemonic and sponsor name to sign this transaction).

    ```javascript
    const newVoucherId = await generateVoucher(
      'sponsorname', // Username from the sponsor wallet account
      'sponsormnemonic', // mnemonic from your wallet, it will sign and pay the tokens for the voucher
      '0x...', // Address to set the voucher (user address)
      ['0x...', ...], // Contracts id to bind the voucher
      2, // Initial amount of tokens in voucher (two tokens),
      1_200 // Initial amount of blocks for voucher (one hour)
    );
    ```

  - `voucherIsExpired`: This function helps to know if a voucher has expired or not.

    ```javascript
    const isExpired = await voucherIsExpired(
        '0x...', // user address
        '0x...' // voucher id
    );

    if (isExpired) {
      console.log('The voucher is expired');
    }
    ```

  - `renewVoucherAmountOfBlocks`: This function renews the voucher for the specified number of blocks (needs the mnemonic and sponsor name to sign this transaction).

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

  - `voucherBalance`: This function returns the balance of a voucher.

     ```javascript
    const totalVoucherBalance = await voucherBalance(
        voucherId
    ); 

    console.log(`Voucher balance ${totalVoucherBalance}`);
    ```

  - `vouchersInContract`: This function returns the vouchers associated with a contract and a user.

    ```javascript
    const vouchersForAddress = await vouchersInContract(
        '0x...', // user address
        '0x...' // Contract id
    );

    console.log('Vouchers from user address and contract id:');
    console.log(vouchersForAddress);
    ```

  - `addTokensToVoucher`: This function adds tokens to a voucher (needs the mnemonic and sponsor name to sign this transaction).

    ```javascript
    await addTokensToVoucher(
        'sponsor name', //Username from the sponsor wallet account
        'sponsor mnemonic', // mnemonic from your wallet, it will sign and pay the tokens for the voucher
        '0x...', // User address
        '0x...', // voucher id
        1 // tokens to add 
    );
    ```
    
- `signlessUtils`: This literal object contains five functions, you can get this functions like this:

  ```javascript
  const {
        signlessUtils
    } = useSailsUtils();
    const {
        createNewKeyringPair,
        lockkeyringPair,
        unlockKeyringPair,
        modifyPairToContract,
        formatContractSignlessData
    } = signlessUtils;
  ```

  Each function is used independently like this:

  + `createNewKeyringPair`: This function will create a new keyringpair, example:

    ```javascript
    const newSignlessAccount = await createNewKeyringPair(
      'signless account name' // if not provided, will use 'signlessPair'
    );
    ```

  + `lockkeyringPair`: This function locks a keyring pair account by giving a password, example:

    ```javascript
    const lockedSignlessAccount = lockkeyringPair(
        newSignlessAccount, // keyring pair to lock
        'password' // password to lock the keyring pair account
    );
    ```

  + `unlockKeyringPair`: Function to unlock a keyring pair account by giving the password with which the account was previously blocked, example:

    ```javascript
    const unlockedKeyringPair = unlockKeyringPair(
        lockedSignlessAccount,
        'password' // if the password is wrong, it will throw an error
    );
    ```

  + `modifyPairToContract`: Function that helps to correctly format a locked keyring pair account to send it to the contract, this function is used in case of using the signless or walletless feature in the contract, example:

    ```javascript
    const modifiedLockedKeyringPair = modifyPairToContract(lockedSignlessAccount);
    ```

  + `formatContractSignlessData`: Function that correctly formats a blocked account that had been modified to be sent to the contract, it is used in case of using the signless or walletless feature in the contract, example:

    ```javascript
    const lockedKeyringAccount = formatContractSignlessData(
        signlessAccountData,
        accountName
    );
    ```