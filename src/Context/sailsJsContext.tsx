import React, { createContext, useState, useContext, useEffect } from "react";
import { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import { GearApi, GearKeyring, HexString, IUpdateVoucherParams } from "@gear-js/api";
import { Sails } from "sails-js";
import { SailsIdlParser } from "sails-js-parser";

// An interface is defined, with string type keys, and Sails type values
interface SailsData {
    [key: string]: Sails
}

// Props to use the provider
interface Props {
    children: JSX.Element
}

// Interface for the provider context
interface SailsJsContextI {
    sails: SailsData | null,
    setSails: React.Dispatch<React.SetStateAction<SailsData | null>> | null,
    gearApi: GearApi | null,
    setGearApi: React.Dispatch<React.SetStateAction<GearApi | null>> | null
}

// Contract data interface for each contract at initialization
export interface ContractData {
    contractName: string,
    contractId: HexString,
    idl: string
}

// Interface to use the Sails initialization hook
export interface InitSailsI {
    contractsData: ContractData[],
    network: string
}

// Sails context
export const sailsContext = createContext<SailsJsContextI>({
    sails: null,
    setSails: null,
    gearApi: null,
    setGearApi: null
});

// Sails Provider
export const SailsProvider = ({ children }: Props) => {
    const [sails, setSails] = useState<SailsData | null>(null);
    const [gearApi, setGearApi] = useState<GearApi | null>(null);

    return (
        <sailsContext.Provider
            value={{
                sails,
                setSails,
                gearApi,
                setGearApi
            }}
        >
            { children }
        </sailsContext.Provider>
    );
}

// Get Sails from context
export const useSailsJs = () => {
    const { sails, gearApi } = useContext(sailsContext);

    const signVoucherAction = (extrinsic: any, sponsorSigner: KeyringPair): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            try {
                await extrinsic.signAndSend(sponsorSigner, async (event: any) => {
                    console.log(event.toHuman());
                    const extrinsicJSON: any = event.toHuman();
                    if (extrinsicJSON && extrinsicJSON.status !== 'Ready') {
                        const objectKey = Object.keys(extrinsicJSON.status)[0];
                        if (objectKey === 'Finalized') {
                            resolve();
                        }
                    }
                });
            } catch (e) {
                console.error(e);
                reject('Error while sign voucher action');
            }
        });
    }

    const generateVoucher = (
        sponsorName: string,
        sponsorMnemonic: string,
        userAddress: HexString,
        contractsId: HexString[],
        initialTokensInVoucher: number,
        initialExpiredTimeInBlocks: number,
    ): Promise<HexString> => {
        return new Promise(async (resolve, reject) => {
            const sponsorSigner = await GearKeyring.fromMnemonic(sponsorMnemonic, sponsorName);

            if (!gearApi) {
                reject('Sails is not initialized');
                return;
            }
           
            if (initialTokensInVoucher < 2) {
                reject('Min limit of initial tokens is 2');
                return;
            }

            if (initialExpiredTimeInBlocks < 20) {
                reject('Min limit of blocks is 20');
                return;
            }

            const voucherIssued = await gearApi.voucher.issue(
                userAddress,
                1e12 * initialTokensInVoucher,
                initialExpiredTimeInBlocks,
                contractsId
            );

            try {
                await signVoucherAction(
                    voucherIssued.extrinsic,
                    sponsorSigner
                );

                resolve(voucherIssued.voucherId);
            } catch (e) {
                reject(e);
            }
        });
    };

    const renewVoucherAmountOfBlocks = (
        sponsorName: string,
        sponsorMnemonic: string,
        userAddress: HexString,
        voucherId: HexString,
        numOfBlocks: number,
    ): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            const sponsorSigner = await GearKeyring.fromMnemonic(sponsorMnemonic, sponsorName);

            if (!gearApi) {
                reject('Sails is not initialized');
                return;
            }
            
            if (numOfBlocks < 20) {
                reject('Minimum block quantity is 20!');
                return;
            }

            const newVoucherData: IUpdateVoucherParams = {
                prolongDuration: numOfBlocks,
            };

            const voucherUpdate = gearApi.voucher.update(userAddress, voucherId, newVoucherData);

            try {
                await signVoucherAction(
                    voucherUpdate,
                    sponsorSigner
                );

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    };

    const addTokensToVoucher = (
        sponsorName: string,
        sponsorMnemonic: string,
        userAddress: HexString,
        voucherId: string, 
        numOfTokens: number,
    ): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            const sponsorSigner = await GearKeyring.fromMnemonic(sponsorMnemonic, sponsorName);

            if (!gearApi) {
                reject('Sails is not initialized');
                return;
            }

            if (numOfTokens < 0) {
                reject('Cant assign negative tokens!');
                return;
            }

            const newVoucherData: IUpdateVoucherParams = {
                balanceTopUp: 1e12 * numOfTokens
            };

            const voucherUpdate = gearApi.voucher.update(userAddress, voucherId, newVoucherData);

            try {
                await signVoucherAction(
                    voucherUpdate,
                    sponsorSigner
                );

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }    

    const vouchersInContract = (
        userAddress: HexString, 
        contractId: HexString
    ): Promise<HexString[]> => {
        return new Promise(async (resolve, reject) => {
            if (!gearApi) {
                reject('Sails is not initialized');
                return;
            }

            const vouchersData = await gearApi
                .voucher
                .getAllForAccount(
                    userAddress, 
                    contractId
                );

            const vouchersId = Object.keys(vouchersData);
            
            resolve(vouchersId as HexString[]);
        });
    }

    const voucherIsExpired = (
        userAddress: HexString, 
        voucherId: HexString
    ): Promise<boolean> => {
        return new Promise(async (resolve, reject) => {
            if (!gearApi) {
                reject('Sails is not initialized');
                return;
            }

            const voucherData = await gearApi
                .voucher
                .getDetails(userAddress, voucherId);
            const blockHash = await gearApi
                .blocks
                .getFinalizedHead();
            const blocks = await gearApi
                .blocks
                .getBlockNumber(blockHash as Uint8Array);

            resolve(blocks.toNumber() > voucherData.expiry);
        });
    }

    const voucherBalance = (voucherId: HexString): Promise<number> => {
        return new Promise(async (resolve, reject) => {
            if (!gearApi) {
                reject('Sails is not initialized');
                return;
            }

            const voucherBalance = await gearApi.balance.findOut(voucherId);
            const voucherBalanceFormated = Number(
                BigInt(voucherBalance.toString()) / 1_000_000_000_000n
            );

            resolve(voucherBalanceFormated);
        });
    }

    const createNewKeyringPair = (nameOfSignlessAccount?: string): Promise<KeyringPair> => {
        return new Promise(async (resolve, reject) => {
            try {
                const name = nameOfSignlessAccount
                    ? nameOfSignlessAccount
                    : 'signlessPair';
                const newPair = await GearKeyring.create(name);
                resolve(newPair.keyring);
            } catch (e) {
                console.log("Error creating new account pair!");
                reject(e);
            }
        });
    }

    const lockkeyringPair = (pair: KeyringPair, password: string): KeyringPair$Json  => {
        return pair.toJson(password);
    }

    const unlockKeyringPair = (pair: KeyringPair$Json, password: string): KeyringPair => {
        return GearKeyring.fromJson(pair, password);
    }

    const formatContractSignlessData = (signlessData: any, signlessName: string): KeyringPair$Json => {
        const temp = {
            encoding: {
                content: ['pkcs8','sr25519'],
                type: ['scrypt','xsalsa20-poly1305'],
                version: '3'
            },
            meta: {
                name: signlessName
            }
        };

        const formatEncryptedSignlessData = Object.assign(signlessData, temp);

        return formatEncryptedSignlessData;
    }

    const modifyPairToContract = (pair: KeyringPair$Json) => {
        const signlessToSend = JSON.parse(JSON.stringify(pair));
        delete signlessToSend['encoding'];
        delete signlessToSend['meta'];
    
        return signlessToSend;
    }

    return {
        sails,
        generateVoucher, 
        renewVoucherAmountOfBlocks, 
        addTokensToVoucher, 
        vouchersInContract, 
        voucherIsExpired, 
        voucherBalance, 
        createNewKeyringPair, 
        lockkeyringPair, 
        unlockKeyringPair, 
        formatContractSignlessData,
        modifyPairToContract 
    };
}

// Hook to init Sails context
export const useInitSailsJs = (data: InitSailsI) => {
    const { setSails, setGearApi } = useContext(sailsContext);
    const [sailsIsReady, setSailsIsReady] = useState(false);

    useEffect(() => {
        const initSails = async () => {
            const sailsJsObject: SailsData = {};
            const { contractsData, network } = data;
            const api = await GearApi.create({
                providerAddress: network
            });
            const provider = await SailsIdlParser.new();

            for (const contractData of contractsData) {
                const sails = new Sails(provider);
                sails.setProgramId(contractData.contractId);
                sails.parseIdl(contractData.idl);
                sails.setApi(api);

                sailsJsObject[contractData.contractName] = sails;
            }

            if (setSails) setSails(sailsJsObject);
            if (setGearApi) setGearApi(api);
            setSailsIsReady(true);
        };

        initSails();
    }, []);

    return {
        sailsIsReady
    }
};


