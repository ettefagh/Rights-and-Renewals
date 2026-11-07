<script lang="ts">
  import { walletStore } from '../../state/wallet.svelte';
  import { Mail, KeyRound, Shield, CheckCircle2, ArrowRight } from 'lucide-svelte';
  import { onDestroy } from 'svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let step = $state<'email' | 'pin'>('email');
  let emailInput = $state('');
  let pin = $state('');
  let hashState = $state('');
  let expiresAtState = $state(0);
  let loading = $state(false);
  let errorMessage = $state('');
  let isShaking = $state(false);
  let resendCooldown = $state(0);
  let cooldownInterval: ReturnType<typeof setInterval>;
  let inputRefs: HTMLInputElement[] = $state([]);

  onDestroy(() => {
    clearInterval(cooldownInterval);
  });

  function startCooldown() {
    resendCooldown = 30;
    clearInterval(cooldownInterval);
    cooldownInterval = setInterval(() => {
      resendCooldown -= 1;
      if (resendCooldown <= 0) {
        clearInterval(cooldownInterval);
      }
    }, 1000);
  }

  function triggerShake() {
    isShaking = true;
    setTimeout(() => {
      isShaking = false;
      pin = '';
      inputRefs[0]?.focus();
    }, 500);
  }

  async function handleRequestPin() {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      errorMessage = 'Please enter a valid email address.';
      return;
    }
    loading = true;
    errorMessage = '';

    try {
      const res = await fetch('/api/auth/request-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send PIN.');

      hashState = data.hash;
      expiresAtState = data.expiresAt;
      step = 'pin';
      startCooldown();
      setTimeout(() => inputRefs[0]?.focus(), 100);
    } catch (err: any) {
      errorMessage = err.message || 'Could not send verification code.';
    } finally {
      loading = false;
    }
  }

  async function handleVerifyPin() {
    const cleanPin = pin.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      errorMessage = 'Please enter all 6 digits of the PIN.';
      return;
    }
    loading = true;
    errorMessage = '';

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim().toLowerCase(),
          pin: cleanPin,
          hash: hashState,
          expiresAt: expiresAtState
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');

      walletStore.isAuthenticated = true;
      walletStore.userEmail = data.email;
      walletStore.icalToken = data.icalToken;
      walletStore.backupBaseSecret = data.baseSecret;
      open = false;
    } catch (err: any) {
      errorMessage = err.message || 'Incorrect PIN entered.';
      triggerShake();
    } finally {
      loading = false;
    }
  }

  function handleInput(index: number, e: Event) {
    errorMessage = '';
    const target = e.target as HTMLInputElement;
    const val = target.value.replace(/\D/g, '');

    if (val.length > 1) {
      // Pasted full code
      const digits = val.slice(0, 6);
      pin = digits;
      const nextIdx = Math.min(digits.length, 5);
      inputRefs[nextIdx]?.focus();
      if (digits.length === 6) {
        handleVerifyPin();
      }
      return;
    }

    const currentDigits = pin.split('');
    currentDigits[index] = val;
    pin = currentDigits.join('');

    if (val && index < 5) {
      inputRefs[index + 1]?.focus();
    }

    if (pin.length === 6 && !loading) {
      handleVerifyPin();
    }
  }

  function handleKeydown(index: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1]?.focus();
    }
  }

  function handleContinueOffline() {
    walletStore.isAuthenticated = false;
    open = false;
  }
</script>

{#if open}
  <div class="modal-backdrop" onclick={() => (open = false)} role="presentation">
    <div class="modal-container" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="modal-header">
        <div class="icon-wrap">
          <Shield size={24} color="#2F524C" />
        </div>
        <h3 class="modal-title">Verification & Calendar Sync</h3>
        <p class="modal-subtitle">
          Verify your email to access live calendar subscriptions and encrypted backup derivation.
        </p>
      </div>

      {#if errorMessage}
        <div class="error-banner">{errorMessage}</div>
      {/if}

      {#if step === 'email'}
        <div class="step-form">
          <label class="field-label" for="auth-email">Email Address</label>
          <div class="input-with-icon">
            <Mail size={18} class="input-icon" />
            <input
              id="auth-email"
              type="email"
              placeholder="student@study.srh.de"
              bind:value={emailInput}
              disabled={loading}
              class="text-input"
              onkeydown={(e) => e.key === 'Enter' && handleRequestPin()}
            />
          </div>

          <button
            type="button"
            class="submit-btn"
            onclick={handleRequestPin}
            disabled={loading}
          >
            {loading ? 'Sending PIN...' : 'Send 6-Digit PIN'}
            <ArrowRight size={16} />
          </button>
        </div>
      {:else}
        <div class="step-form">
          <p class="pin-hint">Enter the 6-digit code sent to <strong>{emailInput}</strong>:</p>
          <div class="otp-inputs" class:shake={isShaking}>
            {#each [0, 1, 2, 3, 4, 5] as index}
              <input
                type="text"
                inputmode="numeric"
                maxlength="1"
                class="otp-digit"
                bind:this={inputRefs[index]}
                value={pin[index] || ''}
                oninput={(e) => handleInput(index, e)}
                onkeydown={(e) => handleKeydown(index, e)}
                disabled={loading}
              />
            {/each}
          </div>

          <button
            type="button"
            class="submit-btn"
            onclick={handleVerifyPin}
            disabled={loading || pin.length < 6}
          >
            {loading ? 'Verifying...' : 'Verify Code & Enable Sync'}
            <CheckCircle2 size={16} />
          </button>

          {#if resendCooldown > 0}
            <span class="cooldown-text">Resend code in {resendCooldown}s</span>
          {:else}
            <button type="button" class="resend-btn" onclick={handleRequestPin} disabled={loading}>
              Resend 6-Digit Code
            </button>
          {/if}
        </div>
      {/if}

      <div class="modal-footer">
        <button type="button" class="offline-fallback-btn" onclick={handleContinueOffline}>
          Continue in Offline Anonymous Mode (Zero Cloud Plaintext)
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-index-modal, 600);
    padding: var(--space-4, 16px);
  }

  .modal-container {
    width: 100%;
    max-width: 440px;
    background: #FFFFFF;
    border-radius: var(--radius-lg, 20px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.2);
    padding: var(--space-6, 24px);
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .modal-header {
    text-align: center;
  }

  .icon-wrap {
    width: 48px;
    height: 48px;
    margin: 0 auto var(--space-2, 8px);
    border-radius: var(--radius-md, 12px);
    background: var(--color-surface-subtle, #F1F5F9);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-title {
    margin: 0;
    font-size: var(--font-size-lg, 18px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .modal-subtitle {
    margin: var(--space-1, 4px) 0 0;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
    line-height: 1.5;
  }

  .error-banner {
    padding: var(--space-2, 8px) var(--space-3, 12px);
    border-radius: var(--radius-sm, 6px);
    background: #FEE2E2;
    color: #991B1B;
    font-size: var(--font-size-xs, 12px);
    text-align: center;
  }

  .field-label {
    display: block;
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-medium, 500);
    margin-bottom: var(--space-1, 4px);
  }

  .input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.input-icon) {
    position: absolute;
    left: var(--space-3, 12px);
    color: var(--color-ink-secondary, #475569);
  }

  .text-input {
    width: 100%;
    height: 44px;
    padding-left: 40px;
    padding-right: var(--space-3, 12px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 12px);
    font-size: var(--font-size-base, 16px);
    background: #FFFFFF;
    color: #0F172A;
  }

  .pin-hint {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
    margin: 0 0 var(--space-3, 12px);
    text-align: center;
  }

  .otp-inputs {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-bottom: var(--space-3, 12px);
  }

  .otp-digit {
    width: 44px;
    height: 52px;
    border: 1.5px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 12px);
    text-align: center;
    font-size: 1.5rem;
    font-weight: 700;
    font-family: monospace;
    background: #FFFFFF;
    color: #0F172A;
    transition: border-color 150ms ease;
  }

  .otp-digit:focus {
    outline: none;
    border-color: var(--color-pine-teal, #2F524C);
  }

  .shake {
    animation: shake 0.5s ease-in-out;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-8px); }
    40%, 80% { transform: translateX(8px); }
  }

  .submit-btn {
    width: 100%;
    height: 44px;
    border-radius: var(--radius-md, 12px);
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    font-weight: var(--font-weight-semibold, 600);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2, 8px);
    cursor: pointer;
    transition: background 150ms;
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cooldown-text {
    display: block;
    text-align: center;
    font-size: var(--font-size-xs, 12px);
    color: #94A3B8;
    margin-top: 8px;
  }

  .resend-btn {
    display: block;
    margin: 8px auto 0;
    background: transparent;
    border: none;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-pine-teal, #2F524C);
    cursor: pointer;
    text-decoration: underline;
  }

  .modal-footer {
    border-top: 1px solid var(--color-border-subtle, #E2E8F0);
    padding-top: var(--space-3, 12px);
    text-align: center;
  }

  .offline-fallback-btn {
    background: transparent;
    border: none;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
    cursor: pointer;
    text-decoration: underline;
  }
</style>
