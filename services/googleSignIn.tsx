import { GoogleSignin } from "@react-native-google-signin/google-signin";

let configured = false;

export function configureGoogleSignIn() {
  if (configured) return;

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!webClientId) {
    throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing");
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
    profileImageSize: 120,
  });

  configured = true;
}

export async function signInWithGoogleAndGetIdToken() {
  configureGoogleSignIn();

  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });

  await GoogleSignin.signIn();

  const tokens = await GoogleSignin.getTokens();
  const idToken = tokens.idToken;

  if (!idToken) {
    throw new Error("Google did not return idToken");
  }

  return idToken;
}

export async function signOutFromGoogleSilently() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
}