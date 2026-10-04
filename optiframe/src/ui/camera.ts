export class CameraUnavailable extends Error {}

export interface CameraLabels {
  takePhoto: string;
  cancel: string;
  unavailable: string;
  denied: string;
}

/** In-app camera (getUserMedia, HTTPS required). Resolves null if the user cancels. */
export async function captureFromCamera(labels: CameraLabels): Promise<Blob | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraUnavailable(labels.unavailable);
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 4096 }, height: { ideal: 3072 } },
      audio: false,
    });
  } catch {
    throw new CameraUnavailable(labels.denied);
  }

  const dlg = document.createElement("dialog");
  dlg.className = "camera";
  dlg.innerHTML = `<video playsinline muted autoplay></video>
    <div class="row">
      <button class="primary" data-act="shot"></button>
      <button data-act="cancel"></button>
    </div>`;
  // Set text via textContent rather than interpolating into innerHTML
  dlg.querySelector('[data-act="shot"]')!.textContent = labels.takePhoto;
  dlg.querySelector('[data-act="cancel"]')!.textContent = labels.cancel;

  document.body.appendChild(dlg);
  const video = dlg.querySelector("video")!;
  video.srcObject = stream;
  await video.play().catch(() => undefined);
  dlg.showModal();

  return new Promise((resolve) => {
    const finish = (b: Blob | null) => {
      stream.getTracks().forEach((t) => t.stop());
      dlg.close();
      dlg.remove();
      resolve(b);
    };
    dlg.querySelector('[data-act="shot"]')!.addEventListener("click", () => {
      const c = document.createElement("canvas");
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext("2d")!.drawImage(video, 0, 0);
      c.toBlob((b) => finish(b), "image/jpeg", 0.95);
    });
    dlg.querySelector('[data-act="cancel"]')!.addEventListener("click", () => finish(null));
    dlg.addEventListener("cancel", () => finish(null));
  });
}
