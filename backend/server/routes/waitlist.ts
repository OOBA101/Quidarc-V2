import type { FastifyInstance } from "fastify";
import { WaitlistService } from "../modules/waitlist/waitlistService.js";

export async function createWaitlistRoutes(server: FastifyInstance) {

    const waitlist = new WaitlistService();

    server.post("/api/waitlist", async (request, reply) => {

        try {

            const body = request.body as {
                email: string;
            };

            const result = await waitlist.join(body.email);

            return reply.send(result);

        } catch (error) {

            return reply.status(400).send({
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });

        }

    });

}