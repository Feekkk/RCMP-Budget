import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ResultSetHeader } from "mysql2";
import type { AuthUser } from "@/lib/auth";

type SessionUser = {
  user: AuthUser;
};

const SUBMIT_STATUS_ID = 1;

const attachmentSchema = z.object({
  name: z.string().min(1),
  data: z.string().min(1),
  type: z.string().optional(),
});

const itemSchema = z.object({
  name: z.string().trim().min(1),
  details: z.string(),
  quantity: z.number().int().positive(),
  pricePerUnit: z.number().positive(),
  attachment: attachmentSchema.optional(),
});

const sessionPassword = "budget_tracker-dev-session-secret-32";

function sessionConfig() {
  return {
    password: sessionPassword,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function uploadsRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../uploads");
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export const submitQuotation = createServerFn({ method: "POST" })
  .validator(z.object({ items: z.array(itemSchema).min(1) }))
  .handler(async ({ data }) => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = session.data.user;
    if (!user) {
      throw new Error("Please sign in to submit a quotation.");
    }

    const { getConnection } = await import("@/server/db");
    const conn = await getConnection();

    try {
      await conn.beginTransaction();

      const [quotationResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO quotations (user_id, status_id) VALUES (?, ?)`,
        [user.userId, SUBMIT_STATUS_ID],
      );
      const quotationId = quotationResult.insertId;

      for (const item of data.items) {
        await conn.query(
          `INSERT INTO quotations_items
            (quotation_id, item_name, item_description, item_quantity, item_price)
           VALUES (?, ?, ?, ?, ?)`,
          [
            quotationId,
            item.name,
            item.details || "",
            item.quantity,
            item.pricePerUnit,
          ],
        );

        if (item.attachment) {
          const dir = join(uploadsRoot(), "quotations", String(quotationId));
          await mkdir(dir, { recursive: true });
          const fileName = `${Date.now()}-${safeFileName(item.attachment.name)}`;
          const absolutePath = join(dir, fileName);
          const relativePath = `uploads/quotations/${quotationId}/${fileName}`;
          await writeFile(absolutePath, Buffer.from(item.attachment.data, "base64"));

          await conn.query(
            `INSERT INTO quotations_attachments
              (quotation_id, attachment_name, attachment_path)
             VALUES (?, ?, ?)`,
            [quotationId, item.attachment.name, relativePath],
          );
        }
      }

      await conn.commit();
      return { quotationId };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  });
