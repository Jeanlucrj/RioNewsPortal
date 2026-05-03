const SITE_URL = process.env.SITE_URL || "https://odiariocarioca.com.br";
const FROM     = "O Diário Carioca <newsletter@odiariocarioca.com.br>";
const RESEND_API = "https://api.resend.com/emails";

export async function sendWelcomeEmail(to: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  RESEND_API_KEY não configurado — e-mail de boas-vindas não enviado");
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;max-width:600px;width:100%">

        <!-- Header -->
        <tr>
          <td style="background:#0ea5e9;padding:32px 40px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px">
              Diário do Carioca
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">
              O Rio de Janeiro em tempo real
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;font-weight:600">
              Bem-vindo(a) à nossa newsletter! 🎉
            </h2>
            <p style="margin:0 0 20px;color:#94a3b8;font-size:16px;line-height:1.6">
              Você agora faz parte da comunidade do <strong style="color:#0ea5e9">Diário do Carioca</strong>.
              A partir de agora você receberá as principais notícias do Rio de Janeiro diretamente na sua caixa de entrada.
            </p>
            <p style="margin:0 0 32px;color:#94a3b8;font-size:16px;line-height:1.6">
              Cobrimos tudo que acontece na cidade: cultura, esportes, gastronomia, shows, vida noturna e muito mais.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#0ea5e9;border-radius:8px;padding:14px 28px">
                  <a href="${SITE_URL}" style="color:#fff;font-size:16px;font-weight:600;text-decoration:none;display:block">
                    Acessar o portal →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Categories -->
        <tr>
          <td style="padding:0 40px 32px">
            <p style="margin:0 0 16px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600">
              Nossas editorias
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                ${["Cultura","Esportes","Shows","Gastronomia","Internacional","Geral"].map(cat => `
                <td style="padding:4px">
                  <a href="${SITE_URL}/categoria/${cat.toLowerCase()}"
                     style="display:inline-block;padding:6px 12px;background:#0f172a;color:#0ea5e9;
                            border-radius:20px;font-size:13px;text-decoration:none;white-space:nowrap">
                    ${cat}
                  </a>
                </td>`).join("")}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #334155;text-align:center">
            <p style="margin:0;color:#475569;font-size:12px;line-height:1.6">
              Você está recebendo este e-mail porque se inscreveu em
              <a href="${SITE_URL}" style="color:#0ea5e9;text-decoration:none">odiariocarioca.com.br</a>.
              <br>
              Para cancelar a inscrição, entre em contato: contato@odiariocarioca.com.br
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const resp = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to:   [to],
      subject: "Bem-vindo(a) ao Diário do Carioca! 🗞️",
      html,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Resend ${resp.status}: ${err}`);
  }

  console.log(`✅ E-mail de boas-vindas enviado para ${to}`);
}
