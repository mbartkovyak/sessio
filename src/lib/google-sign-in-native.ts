import { registerPlugin } from '@capacitor/core';

interface GoogleSignInPlugin {
  signIn(options: { webClientId: string }): Promise<{ idToken: string }>;
  signOut(): Promise<void>;
}

const GoogleSignIn = registerPlugin<GoogleSignInPlugin>('GoogleSignIn');

export { GoogleSignIn };
