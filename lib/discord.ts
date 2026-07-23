import "server-only";
import { STATUS_LABELS, type Ticket, type TicketStatus } from "@/lib/models";

const EMBED_COLOR = 0x2ecc71; // green accent bar, matches the old Jira integration
const FOOTER_ICON_URL = "https://i.imgur.com/Ut4OcT1.png";

/** Fire-and-forget: posts a status-change embed for public tickets. Never throws. */
export async function notifyDiscordStatusChange(
  ticket: Ticket,
  fromStatus: TicketStatus,
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const embed = {
    title: `Ticket ${ticket.key}`,
    color: EMBED_COLOR,
    fields: [
      { name: "📄 Description", value: ticket.title, inline: false },
      { name: "🏷️ Type", value: ticket.taskType, inline: false },
      {
        name: "🔄 Status Change",
        value: `${STATUS_LABELS[fromStatus]} → ${STATUS_LABELS[ticket.status]}`,
        inline: false,
      },
    ],
    footer: { text: "Omnipair", icon_url: FOOTER_ICON_URL },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      console.error("Discord webhook failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("Discord webhook error", err);
  }
}
