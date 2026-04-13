package com.get_sessio.app;

import androidx.annotation.NonNull;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CredentialManager;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.util.concurrent.Executors;

/**
 * Local Capacitor plugin that wraps Android's Credential Manager API for
 * Google Sign-In. Shows the native system account picker, returns an ID
 * token that Supabase can verify via signInWithIdToken.
 *
 * Avoids Chrome Custom Tab entirely — no shared cookies, no broken redirect
 * chains when switching Google accounts.
 */
@CapacitorPlugin(name = "GoogleSignIn")
public class GoogleSignInPlugin extends Plugin {

    @PluginMethod
    public void signIn(PluginCall call) {
        String webClientId = call.getString("webClientId");
        if (webClientId == null || webClientId.isEmpty()) {
            call.reject("webClientId is required");
            return;
        }

        GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
                .setServerClientId(webClientId)
                .setFilterByAuthorizedAccounts(false)
                .build();

        GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build();

        CredentialManager credentialManager = CredentialManager.create(getContext());

        credentialManager.getCredentialAsync(
                getActivity(),
                request,
                null, // CancellationSignal
                Executors.newSingleThreadExecutor(),
                new androidx.credentials.CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(@NonNull GetCredentialResponse response) {
                        try {
                            GoogleIdTokenCredential credential =
                                    GoogleIdTokenCredential.createFrom(response.getCredential().getData());
                            String idToken = credential.getIdToken();
                            if (idToken == null || idToken.isEmpty()) {
                                call.reject("Google ID token was empty");
                                return;
                            }
                            JSObject result = new JSObject();
                            result.put("idToken", idToken);
                            call.resolve(result);
                        } catch (Exception e) {
                            call.reject("Failed to extract Google ID token", e);
                        }
                    }

                    @Override
                    public void onError(@NonNull GetCredentialException e) {
                        if (e instanceof GetCredentialCancellationException) {
                            call.reject("cancelled", "USER_CANCELLED", e);
                        } else {
                            call.reject("Google Sign-In failed: " + e.getMessage(), e);
                        }
                    }
                }
        );
    }

    /**
     * Clear cached credential state. Call on sign-out so the next signIn()
     * always shows a fresh account picker.
     */
    @PluginMethod
    public void signOut(PluginCall call) {
        CredentialManager credentialManager = CredentialManager.create(getContext());
        credentialManager.clearCredentialStateAsync(
                new ClearCredentialStateRequest(),
                null,
                Executors.newSingleThreadExecutor(),
                new androidx.credentials.CredentialManagerCallback<Void, androidx.credentials.exceptions.ClearCredentialException>() {
                    @Override
                    public void onResult(Void unused) {
                        call.resolve();
                    }

                    @Override
                    public void onError(@NonNull androidx.credentials.exceptions.ClearCredentialException e) {
                        // Best-effort — don't block logout if clearing fails
                        call.resolve();
                    }
                }
        );
    }
}
