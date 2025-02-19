import {
  EthSignType,
  OWallet,
  OWalletIntereactionOptions,
  OWalletMode,
  OWalletSignOptions,
  Key,
  AminoSignResponse,
  BroadcastMode,
  StdSignature,
  StdSignDoc,
  OfflineAminoSigner,
  OfflineDirectSigner,
  DirectSignResponse,
  ICNSAdr36Signatures,
  ChainInfoWithoutEndpoints,
  SecretUtils,
  SettledResponses,
  DirectAuxSignResponse,
  IEthereumProvider,
} from "@owallet/types";
import {
  Bech32Address,
  encodeSecp256k1Signature,
  serializeSignDoc,
} from "@owallet/cosmos";
import {
  CosmJSOfflineSigner,
  CosmJSOfflineSignerOnlyAmino,
} from "@owallet/provider";
import { Hash, Mnemonic, PrivKeySecp256k1 } from "@owallet/crypto";
import Long from "long";
import { SignDoc } from "@owallet/proto-types/cosmos/tx/v1beta1/tx";
import EventEmitter from "events";

export class MockOWallet implements OWallet {
  readonly version: string = "0.0.1";
  readonly mode: OWalletMode = "extension";

  public defaultOptions: OWalletIntereactionOptions = {};

  public readonly walletMap: {
    [chainId: string]: PrivKeySecp256k1 | undefined;
  } = {};

  getWallet(chainId: string): PrivKeySecp256k1 {
    if (!this.walletMap[chainId]) {
      const chainInfo = this.chainInfos.find(
        (info) => info.chainId === chainId
      );

      if (!chainInfo) {
        throw new Error("Unknown chain");
      }

      this.walletMap[chainId] = new PrivKeySecp256k1(
        Mnemonic.generateWalletFromMnemonic(this.mnemonic)
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.walletMap[chainId]!;
  }

  constructor(
    public readonly sendTxFn: (
      chainId: string,
      stdTx: Uint8Array,
      mode: BroadcastMode
    ) => Promise<Uint8Array>,
    public readonly chainInfos: {
      readonly chainId: string;
      readonly bech32Config: {
        readonly bech32PrefixAccAddr: string;
      };
    }[],
    public readonly mnemonic: string
  ) {}

  ping(): Promise<void> {
    // noop.
    return Promise.resolve();
  }

  enable(): Promise<void> {
    // noop.
    return Promise.resolve(undefined);
  }

  enigmaDecrypt(): Promise<Uint8Array> {
    throw new Error("Not implemented");
  }

  enigmaEncrypt(): Promise<Uint8Array> {
    throw new Error("Not implemented");
  }

  experimentalSuggestChain(): Promise<void> {
    throw new Error("Not implemented");
  }

  getEnigmaPubKey(): Promise<Uint8Array> {
    throw new Error("Not implemented");
  }

  getEnigmaUtils(_chainId: string): SecretUtils {
    throw new Error("Not implemented");
  }

  async getKey(chainId: string): Promise<Key> {
    const wallet = this.getWallet(chainId);

    return {
      name: "mock",
      algo: "secp256k1",
      pubKey: wallet.getPubKey().toBytes(),
      address: wallet.getPubKey().getCosmosAddress(),
      bech32Address: new Bech32Address(
        wallet.getPubKey().getCosmosAddress()
      ).toBech32(
        this.chainInfos.find((c) => c.chainId === chainId)?.bech32Config
          ?.bech32PrefixAccAddr ?? ""
      ),
      ethereumHexAddress: new Bech32Address(
        wallet.getPubKey().getCosmosAddress()
      ).toHex(true),
      isNanoLedger: false,
      isKeystone: false,
    };
  }

  async getKeysSettled(chainIds: string[]): Promise<SettledResponses<Key>> {
    return chainIds.map((chainId) => {
      const wallet = this.getWallet(chainId);

      return {
        status: "fulfilled",
        value: {
          name: "mock",
          algo: "secp256k1",
          pubKey: wallet.getPubKey().toBytes(),
          address: wallet.getPubKey().getCosmosAddress(),
          bech32Address: new Bech32Address(
            wallet.getPubKey().getCosmosAddress()
          ).toBech32(
            this.chainInfos.find((c) => c.chainId === chainId)!.bech32Config
              .bech32PrefixAccAddr
          ),
          ethereumHexAddress: new Bech32Address(
            wallet.getPubKey().getCosmosAddress()
          ).toHex(true),
          isNanoLedger: false,
          isKeystone: false,
        },
      };
    });
  }

  signArbitrary(
    _chainId: string,
    _signer: string,
    _data: string | Uint8Array
  ): Promise<StdSignature> {
    throw new Error("Not implemented");
  }

  verifyArbitrary(
    _chainId: string,
    _signer: string,
    _data: string | Uint8Array,
    _signature: StdSignature
  ): Promise<boolean> {
    throw new Error("Not implemented");
  }

  signEthereum(
    _chainId: string,
    _signer: string,
    _data: string | Uint8Array,
    _type: EthSignType
  ): Promise<Uint8Array> {
    throw new Error("Not implemented");
  }

  signICNSAdr36(
    _chainId: string,
    _contractAddress: string,
    _owner: string,
    _username: string,
    _addressChainIds: string[]
  ): Promise<ICNSAdr36Signatures> {
    throw new Error("Not implemented");
  }

  getOfflineSigner(
    chainId: string,
    _?: OWalletSignOptions
  ): OfflineAminoSigner & OfflineDirectSigner {
    return new CosmJSOfflineSigner(chainId, this);
  }

  getSecret20ViewingKey(): Promise<string> {
    throw new Error("Not implemented");
  }

  sendTx(
    chainId: string,
    stdTx: Uint8Array,
    mode: BroadcastMode
  ): Promise<Uint8Array> {
    return this.sendTxFn(chainId, stdTx, mode);
  }

  async signAmino(
    chainId: string,
    signer: string,
    signDoc: StdSignDoc,
    _?: OWalletSignOptions
  ): Promise<AminoSignResponse> {
    const wallet = await this.getWallet(chainId);

    const key = await this.getKey(chainId);
    if (signer !== key.bech32Address) {
      throw new Error("Unmatched signer");
    }

    const signature = wallet.signDigest32(
      Hash.sha256(serializeSignDoc(signDoc))
    );

    return {
      signed: signDoc,
      signature: encodeSecp256k1Signature(
        wallet.getPubKey().toBytes(),
        new Uint8Array([...signature.r, ...signature.s])
      ),
    };
  }

  async signDirect(
    chainId: string,
    signer: string,
    signDoc: {
      /** SignDoc bodyBytes */
      bodyBytes?: Uint8Array | null;

      /** SignDoc authInfoBytes */
      authInfoBytes?: Uint8Array | null;

      /** SignDoc chainId */
      chainId?: string | null;

      /** SignDoc accountNumber */
      accountNumber?: Long | null;
    },
    _?: OWalletSignOptions
  ): Promise<DirectSignResponse> {
    const wallet = await this.getWallet(chainId);

    const key = await this.getKey(chainId);
    if (signer !== key.bech32Address) {
      throw new Error("Unmatched signer");
    }

    const signature = wallet.signDigest32(
      Hash.sha256(
        SignDoc.encode(
          SignDoc.fromPartial({
            bodyBytes: signDoc.bodyBytes!,
            authInfoBytes: signDoc.authInfoBytes!,
            chainId: signDoc.chainId!,
            accountNumber: signDoc.accountNumber!.toString(),
          })
        ).finish()
      )
    );

    return {
      signed: {
        bodyBytes: signDoc.bodyBytes!,
        authInfoBytes: signDoc.authInfoBytes!,
        chainId: signDoc.chainId!,
        accountNumber: signDoc.accountNumber!,
      },
      signature: encodeSecp256k1Signature(
        wallet.getPubKey().toBytes(),
        new Uint8Array([
          ...signature.r.map((b) => (Math.random() > 0.5 ? 0 : b)),
          ...signature.s.map((b) => (Math.random() > 0.5 ? 0 : b)),
        ])
      ),
    };
  }

  signDirectAux(
    _chainId: string,
    _signer: string,
    _signDoc: {
      bodyBytes?: Uint8Array | null;
      publicKey?: {
        typeUrl: string;
        value: Uint8Array;
      } | null;
      chainId?: string | null;
      accountNumber?: Long | null;
      sequence?: Long | null;
      tip?: {
        amount: {
          denom: string;
          amount: string;
        }[];
        tipper: string;
      } | null;
    },
    _signOptions?: Exclude<
      OWalletSignOptions,
      "preferNoSetFee" | "disableBalanceCheck"
    >
  ): Promise<DirectAuxSignResponse> {
    throw new Error("Not implemented");
  }

  suggestToken(): Promise<void> {
    throw new Error("Not implemented");
  }

  getEnigmaTxEncryptionKey(
    _chainId: string,
    _nonce: Uint8Array
  ): Promise<Uint8Array> {
    throw new Error("Not implemented");
  }

  getOfflineSignerAuto(
    _chainId: string,
    _?: OWalletSignOptions
  ): Promise<OfflineAminoSigner | OfflineDirectSigner> {
    throw new Error("Not implemented");
  }

  getOfflineSignerOnlyAmino(
    chainId: string,
    _?: OWalletSignOptions
  ): OfflineAminoSigner {
    return new CosmJSOfflineSignerOnlyAmino(chainId, this);
  }

  experimentalSignEIP712CosmosTx_v0(
    _chainId: string,
    _signer: string,
    _eip712: {
      types: Record<string, { name: string; type: string }[] | undefined>;
      domain: Record<string, any>;
      primaryType: string;
    },
    _signDoc: StdSignDoc,
    _signOptions: OWalletSignOptions = {}
  ): Promise<AminoSignResponse> {
    throw new Error("Not yet implemented");
  }

  getChainInfosWithoutEndpoints(): Promise<ChainInfoWithoutEndpoints[]> {
    throw new Error("Not yet implemented");
  }

  getChainInfoWithoutEndpoints(
    _chainId: string
  ): Promise<ChainInfoWithoutEndpoints> {
    throw new Error("Not yet implemented");
  }

  disable(_chainIds?: string | string[]): Promise<void> {
    throw new Error("Not yet implemented");
  }

  changeKeyRingName(_opts: {
    defaultName: string;
    editable?: boolean | undefined;
  }): Promise<string> {
    throw new Error("Not yet implemented");
  }

  sendEthereumTx(_chainId: string, _tx: Uint8Array): Promise<string> {
    throw new Error("Not yet implemented");
  }

  suggestERC20(_chainId: string, _contractAddress: string): Promise<void> {
    throw new Error("Not yet implemented");
  }

  public readonly ethereum = new MockEthereumProvider();
}

class MockEthereumProvider extends EventEmitter implements IEthereumProvider {
  readonly chainId: string | null = null;
  readonly selectedAddress: string | null = null;

  readonly networkVersion: string | null = null;

  readonly isOWallet: boolean = true;
  readonly isMetaMask: boolean = true;

  constructor() {
    super();
  }

  isConnected(): boolean {
    throw new Error("Method not implemented.");
  }

  request<T>({}: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<T> {
    throw new Error("Not yet implemented");
  }

  enable(): Promise<string[]> {
    throw new Error("Method not implemented.");
  }

  net_version(): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
