/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  const search = typeof window !== 'undefined' ? window.location.search : '';

  function applyRequestedUi(event: { currentTarget: HTMLIFrameElement }) {
    try {
      const doc = event.currentTarget.contentDocument;
      if (!doc || doc.getElementById('privacyFooter')) return;

      const tvLink = doc.getElementById('tvBrowserBtn');
      if (tvLink) tvLink.textContent = 'ليالي الرياض';

      const style = doc.createElement('style');
      style.textContent = `
        #privacyFooter{width:min(100% - 28px,900px);margin:30px auto 18px;padding:18px 12px;text-align:center;border-top:1px solid rgba(255,255,255,.14)}
        #privacyBtn{border:1px solid rgba(255,209,102,.48);border-radius:12px;padding:11px 24px;background:rgba(255,209,102,.09);color:#ffdf91;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer}
        #privacyModal{display:none;position:fixed;inset:0;z-index:1200;background:rgba(7,3,13,.9);backdrop-filter:blur(6px);overflow-y:auto;padding:44px 16px 24px}
        #privacyModal.show{display:flex;align-items:flex-start;justify-content:center}
        #privacyModal .privacyCard{width:100%;max-width:560px;margin:auto;background:linear-gradient(180deg,#241242,#170a2b);border:1px solid rgba(255,209,102,.38);border-radius:20px;padding:22px;color:#fff;line-height:1.9}
        #privacyModal h2{color:#ffdf91;font-size:20px;margin:0 0 12px}
        #privacyModal p{margin:0 0 12px;color:rgba(255,255,255,.88)}
        #privacyClose{margin-top:8px;width:100%;border:0;border-radius:12px;padding:12px;background:linear-gradient(90deg,#fbbf24,#f59e0b);color:#190a00;font-weight:800;cursor:pointer}
      `;
      doc.head.appendChild(style);

      const footer = doc.createElement('div');
      footer.id = 'privacyFooter';
      footer.innerHTML = '<button id="privacyBtn" type="button">سياسة الخصوصية</button>';
      doc.body.appendChild(footer);

      const modal = doc.createElement('div');
      modal.id = 'privacyModal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = `
        <div class="privacyCard">
          <h2>سياسة الخصوصية</h2>
          <p>تُستخدم مكتبة ألعاب ليالي الرياض لتصفح الألعاب وربطها بالتلفزيون عند اختيارك ذلك.</p>
          <p>قد يُحفظ اسم اللاعب الذي تدخله اختيارياً على جهازك لتسهيل استخدام المكتبة لاحقاً. لا تدخل معلومات شخصية أو حساسة لا تحتاجها الخدمة.</p>
          <p>تُستخدم الكاميرا فقط عند اختيار مسح رمز QR. ويمكنك رفض إذن الكاميرا واستخدام رمز الاقتران يدوياً.</p>
          <p>لا يتم فتح أي رابط خارجي تلقائياً؛ لا تنتقل إلى رابط إلا عند ضغطك عليه.</p>
          <button id="privacyClose" type="button">إغلاق</button>
        </div>`;
      doc.body.appendChild(modal);

      const open = () => modal.classList.add('show');
      const close = () => modal.classList.remove('show');
      doc.getElementById('privacyBtn')?.addEventListener('click', open);
      doc.getElementById('privacyClose')?.addEventListener('click', close);
      modal.addEventListener('click', e => { if (e.target === modal) close(); });
      doc.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    } catch (error) {
      console.error('تعذر إضافة زر سياسة الخصوصية:', error);
    }
  }

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#170b24]">
      <iframe
        src={`/%D9%85%D9%83%D8%AA%D8%A8%D8%A9_%D8%A7%D9%84%D8%A3%D9%84%D8%B9%D8%A7%D8%A8-2.html${search}`}
        title="مكتبة ألعاب ليالي الرياض"
        className="w-full h-full border-0 block"
        allow="camera; microphone"
        onLoad={applyRequestedUi}
      />
    </main>
  );
}
