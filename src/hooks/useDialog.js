import { useState, useCallback } from 'react';

/**
 * useConfirm – imperative confirm dialog hook.
 *
 * Usage:
 *   const { confirm, ConfirmDialogComponent } = useConfirm();
 *   const ok = await confirm({ title: 'Delete?', message: '...', variant: 'danger' });
 *   if (ok) { ... }
 *   return <>{ConfirmDialogComponent}</>
 */
export function useConfirm() {
  const [state, setState] = useState({ open: false, resolve: null, props: {} });

  const confirm = useCallback((props = {}) => {
    return new Promise((resolve) => {
      setState({ open: true, resolve, props });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ open: false, resolve: null, props: {} });
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ open: false, resolve: null, props: {} });
  }, [state.resolve]);

  const dialogProps = {
    open: state.open,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
    ...state.props,
  };

  return { confirm, dialogProps };
}

/**
 * usePrompt – imperative prompt dialog hook.
 *
 * Usage:
 *   const { prompt, PromptDialogProps } = usePrompt();
 *   const value = await prompt({ title: 'Name?', defaultValue: 'Tower A' });
 *   if (value !== null) { ... }
 *   return <>{PromptDialogComponent}</>
 */
export function usePrompt() {
  const [state, setState] = useState({ open: false, resolve: null, props: {} });

  const prompt = useCallback((props = {}) => {
    return new Promise((resolve) => {
      setState({ open: true, resolve, props });
    });
  }, []);

  const handleConfirm = useCallback((value) => {
    state.resolve?.(value);
    setState({ open: false, resolve: null, props: {} });
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(null);
    setState({ open: false, resolve: null, props: {} });
  }, [state.resolve]);

  const dialogProps = {
    open: state.open,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
    ...state.props,
  };

  return { prompt, dialogProps };
}
