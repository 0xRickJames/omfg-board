import "server-only";
import { STATUS_LABELS, type Ticket, type TicketStatus } from "@/lib/models";

const EMBED_COLOR = 0x2ecc71; // green accent bar, matches the old Jira integration
const FOOTER_ICON_URL = "https://i.imgur.com/Ut4OcT1.png";
const COMMITS_EMBED_COLOR = 0x5865f2; // Discord blurple — visually distinct from ticket-status posts

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

export interface CommitInfo {
  id: string;
  message: string;
  url: string;
  authorName: string;
}

/** Fire-and-forget: posts one message per pushed commit, across every repo
 *  with a webhook pointed here. Unlike notifyDiscordStatusChange, this is a
 *  raw activity feed — not tied to tickets or their public/private flag.
 *  Never throws. */
export async function notifyDiscordCommit(
  repoFullName: string,
  commit: CommitInfo,
): Promise<void> {
  const webhookUrl = process.env.DISCORD_COMMITS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const shortSha = commit.id.slice(0, 7);
  const newlineIndex = commit.message.indexOf("\n");
  const title = newlineIndex === -1 ? commit.message : commit.message.slice(0, newlineIndex);
  const description = newlineIndex === -1 ? "" : commit.message.slice(newlineIndex + 1).trim();

  const embed = {
    title: `${repoFullName} — ${shortSha}`,
    url: commit.url,
    description: description ? `${title}\n\n${description}` : title,
    color: COMMITS_EMBED_COLOR,
    footer: { text: commit.authorName },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      console.error("Discord commits webhook failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("Discord commits webhook error", err);
  }
}
