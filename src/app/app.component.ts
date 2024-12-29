import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {AppKit, ConnectedWalletInfo, createAppKit} from '@reown/appkit';
import {WagmiAdapter} from '@reown/appkit-adapter-wagmi';
import {AppKitNetwork} from '@reown/appkit/networks';
import {createConfig, getPublicClient, http} from '@wagmi/core';
import {bsc} from '@wagmi/core/chains';
import {parseEther} from 'viem';
import {Subscription} from 'rxjs';
import {Config} from 'wagmi';
import {CommonModule} from '@angular/common';
import {sendTransaction, switchChain} from 'wagmi/actions';

const featuredWallets = [
  'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // metamask
  '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4', // binance
  'e401b54ca287ce5c4c4579a91220e79816cff07cdf18b388fde84449c3be8a51', // koala
];
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [bsc];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  wagmiAdapter: WagmiAdapter | undefined;
  metadata = {
    name: 'Appkit test',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    url: 'https://my-appkit-test.io',
    icons: [],
  };
  config: Config | undefined;
  modal: AppKit | undefined;
  account: string | undefined;
  accountStatus: string | undefined;
  providerReady = false;
  walletInfo: ConnectedWalletInfo | undefined;

  subscription = new Subscription();

  async connectWallet(): Promise<void> {
    const projectId = '7c954e216e53a6243d1061a0b09346db';

    this.config = createConfig({
      chains: [bsc],
      transports: {
        [bsc.id]: http(),
      },
    });
    this.wagmiAdapter = new WagmiAdapter({projectId, networks});
    this.modal = createAppKit({
      projectId,
      networks,
      defaultNetwork: networks[0],
      adapters: [this.wagmiAdapter],
      metadata: this.metadata,
      themeMode: 'light',
      features: {
        email: false,
        socials: false,
        analytics: false,
        onramp: false,
        swaps: false,
      },
      featuredWalletIds: featuredWallets,
    });

    //await this.disconnect();

    await this.modal.open();

    let isConnected = false; // prevent multiple calls

    this.modal.subscribeAccount(async (account) => {
      this.accountStatus = account.status;
      if (account.status === 'connected' && !isConnected) {
        isConnected = true;
        this.account = account.address;

        await this.waitForWalletReady();

        console.log('status:', this.config?.state.status); // this stays 'disconnected' forever
      }
    });
  }

  private async waitForWalletReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkProvider = async () => {
        if (!this.config) {
          throw new Error('Config not found');
        }
        const provider = getPublicClient(this.config);
        if (provider) {
          try {
            // test if provider is ready by making a simple call
            await provider.getChainId();
            this.providerReady = true;
            resolve();
            return;
          } catch (e) {
            // provider not ready yet
          }
        }
        setTimeout(checkProvider, 100);
      };
      checkProvider();
    });
  }

  // this won't work with Wallet Connect QR code connections
  async sendTransaction(): Promise<void> {
    if (!this.account) {
      console.error('Wallet not connected');
      return;
    }

    if (!this.config) {
      console.error('Config not found');
      return;
    }

    await switchChain(this.config, {chainId: bsc.id});
    await sendTransaction(this.config, {
      chainId: bsc.id,
      to: '0x2537a5F47166940A967e6272FBBb6B1b4928C62a',
      value: parseEther('0.0001', 'wei'),
    });
  }
}
