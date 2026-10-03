import QRCode from "qrcode";

/** QR code of the current page URL, for the demo. */
export async function showQr(dialog: HTMLDialogElement, box: HTMLElement): Promise<void> {
  const url = location.href.split("#")[0];
  box.innerHTML = await QRCode.toString(url, { type: "svg", margin: 1, width: 260 });
  dialog.querySelector<HTMLElement>(".qr-url")!.textContent = url;
  dialog.showModal();
}
