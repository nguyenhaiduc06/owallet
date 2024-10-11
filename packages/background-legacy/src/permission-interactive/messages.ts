import { OWalletError, Message } from "@owallet/router";
import { ROUTE } from "./constants";

export class EnableAccessMsg extends Message<void> {
  public static type() {
    return "enable-access";
  }

  constructor(public readonly chainIds: string[]) {
    super();
  }

  validateBasic(): void {
    if (!this.chainIds || this.chainIds.length === 0) {
      throw new OWalletError("permission", 100, "chain id not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  override approveExternal(): boolean {
    return true;
  }

  type(): string {
    return EnableAccessMsg.type();
  }
}

export class EnableAccessForEVMMsg extends Message<void> {
  public static type() {
    return "enable-access-for-evm";
  }

  constructor() {
    super();
  }

  validateBasic(): void {
    // noop
  }

  route(): string {
    return ROUTE;
  }

  override approveExternal(): boolean {
    return true;
  }

  type(): string {
    return EnableAccessForEVMMsg.type();
  }
}

export class DisableAccessMsg extends Message<void> {
  public static type() {
    return "disable-access";
  }

  constructor(public readonly chainIds: string[]) {
    super();
  }

  validateBasic(): void {
    if (!this.chainIds) {
      throw new OWalletError("permission", 100, "chain id not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  override approveExternal(): boolean {
    return true;
  }

  type(): string {
    return DisableAccessMsg.type();
  }
}

export class IsEnabledAccessMsg extends Message<boolean> {
  public static type() {
    return "is-enabled-access";
  }

  constructor(public readonly chainIds: string[]) {
    super();
  }

  validateBasic(): void {
    if (!this.chainIds || this.chainIds.length === 0) {
      throw new OWalletError("permission", 100, "chain id not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  override approveExternal(): boolean {
    return true;
  }

  type(): string {
    return IsEnabledAccessMsg.type();
  }
}
