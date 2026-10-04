import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  ConfidentialClientApplication,
  CryptoProvider,
} from '@azure/msal-node';
import { AppConfigService } from '../../config/app-config/app-config.service.js';

@Injectable()
export class EntraService {
  private readonly scopes = ['openid', 'profile', 'email'];
  private readonly cryptoProvider = new CryptoProvider();
  private readonly client: ConfidentialClientApplication;

  constructor(private readonly appConfig: AppConfigService) {
    // A tenant-specific authority restricts sign-in to this directory only.
    this.client = new ConfidentialClientApplication({
      auth: {
        clientId: appConfig.entraClientId,
        clientSecret: appConfig.entraClientSecret,
        authority: `https://login.microsoftonline.com/${appConfig.entraTenantId}`,
      },
    });
  }

  async createAuthRequest() {
    const { verifier, challenge } =
      await this.cryptoProvider.generatePkceCodes();
    const state = this.cryptoProvider.createNewGuid();
    const url = await this.client.getAuthCodeUrl({
      scopes: this.scopes,
      redirectUri: this.appConfig.entraRedirectUri,
      state,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
    });
    return { url, state, verifier };
  }

  async redeemCode(code: string, verifier: string) {
    const result = await this.client.acquireTokenByCode({
      code,
      scopes: this.scopes,
      redirectUri: this.appConfig.entraRedirectUri,
      codeVerifier: verifier,
    });

    const claims = result.idTokenClaims as Record<string, unknown>;
    const oid = claims['oid'];
    const email = claims['email'] ?? claims['preferred_username'];
    const name = claims['name'] ?? email;
    if (
      typeof oid !== 'string' ||
      typeof email !== 'string' ||
      typeof name !== 'string'
    ) {
      throw new UnauthorizedException('Incomplete Entra ID profile');
    }
    return { oid, email: email.toLowerCase(), name };
  }
}
