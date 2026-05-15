import { useCallback, useEffect, useRef, type MouseEvent } from "react";

type PreviewImageFullscreenProps = {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
};

async function requestOverlayFullscreen(element: HTMLElement): Promise<boolean> {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return document.fullscreenElement === element;
    }
    const webkitRequest = (
      element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
    ).webkitRequestFullscreen;
    if (webkitRequest) {
      await webkitRequest.call(element);
      return document.fullscreenElement === element;
    }
  } catch {
    /* user agent denied or unsupported */
  }
  return false;
}

async function exitOverlayFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return;
      }
      const webkitExit = (
        document as Document & { webkitExitFullscreen?: () => Promise<void> }
      ).webkitExitFullscreen;
      if (webkitExit) {
        await webkitExit.call(document);
      }
    }
  } catch {
    /* ignore */
  }
}

/** Fullscreen diagram view: native Fullscreen API when available, modal overlay otherwise. */
export function PreviewImageFullscreen({ open, imageSrc, onClose }: PreviewImageFullscreenProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const usingNativeFullscreenRef = useRef(false);

  const close = useCallback(async () => {
    await exitOverlayFullscreen();
    usingNativeFullscreenRef.current = false;
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const entered = await requestOverlayFullscreen(overlay);
      if (!cancelled) {
        usingNativeFullscreenRef.current = entered;
      }
    })();

    closeButtonRef.current?.focus();

    function handleFullscreenChange() {
      if (!document.fullscreenElement && usingNativeFullscreenRef.current) {
        usingNativeFullscreenRef.current = false;
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.fullscreenElement) {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelled = true;
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      return;
    }
    usingNativeFullscreenRef.current = false;
    void exitOverlayFullscreen();
  }, [open]);

  if (!open || !imageSrc) {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      void close();
    }
  }

  return (
    <div
      className="tdg-preview-fullscreen"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen diagram preview"
      onClick={handleBackdropClick}
    >
      <button
        type="button"
        ref={closeButtonRef}
        className="tdg-preview-fullscreen-close"
        onClick={() => void close()}
        aria-label="Close fullscreen preview"
      >
        ×
      </button>
      <div className="tdg-preview-fullscreen-stage">
        <img className="tdg-preview-fullscreen-image" src={imageSrc} alt="Generated diagram (fullscreen)" />
      </div>
    </div>
  );
}
