const db = require("../models/db");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
let io;
module.exports = function setupSocket(server) {
    io = new Server(server, {
        cors: { origin: "*" },
        pingInterval: 25000, 
        pingTimeout: 20000,
    });
    const onlineUsers = new Map();  

    io.on("connection", (socket) => {
        console.log(" User connected:", socket.id);

        socket.isAlive = true;
        socket.on("pong", () => {
            socket.isAlive = true;
        });
        socket.on("register", (userId) => {
            if (!userId) {
                console.error("register: Missing userId");
                return;
            }
            console.log("socket register",userId);
            onlineUsers.set(userId, socket.id);
            console.log(`User ${userId} registered with socket id ${socket.id}`);
        });

        socket.on("joinConversation", async (conversation_id) => {
            if (!conversation_id) {
                console.error("joinConversation: Missing conversation_id");
                return;
            }
            socket.join(conversation_id);
            console.log(`User joined conversation: ${conversation_id}`);
        });

        // socket.on("sendMessage", async ({ conversation_id, sender_id, message, message_type }) => {
        //     if (!conversation_id || !sender_id || !message_type) {
        //         console.error("sendMessage: Missing required fields", { conversation_id, sender_id, message_type });
        //         return;
        //     }

        //     try {
        //         console.log("📨 New message received:", { conversation_id, sender_id, message, message_type });

        //         // const [result] = await db.execute(
        //         //     "INSERT INTO Messages (message_id, conversation_id, sender_id, message_type) VALUES (UUID(), ?, ?, ?)",
        //         //     [conversation_id, sender_id, message_type]
        //         // );

        //         const message_id = uuidv4();
        //         await db.execute(
        //             "INSERT INTO Messages (message_id, conversation_id, sender_id, message_type) VALUES (?, ?, ?, ?)",
        //             [message_id, conversation_id, sender_id, message_type]
        //         );
        //         if (message_type === "text" && message) {
        //             await db.execute(
        //                 "INSERT INTO MessageContents (message_id, content) VALUES (?, ?)",
        //                 [message_id, message]
        //             );
        //         }

        //         const [participants] = await db.execute(
        //             "SELECT user_id FROM ConversationParticipants WHERE conversation_id = ? AND user_id != ?",
        //             [conversation_id, sender_id]
        //         );
        //         for (const participant of participants) {
        //             await db.execute(
        //                 "INSERT INTO MessageStatus (status_id, message_id, user_id, is_read) VALUES (UUID(), ?, ?, FALSE)",
        //                 [message_id, participant.user_id]
        //             );
        //         }
        //         const timestamp = new Date().toISOString();
        //         const newMessage = { message_id, conversation_id, sender_id, message, message_type, timestamp };
        //         io.to(conversation_id).emit("receiveMessage", newMessage);
        //         console.log("Message sent:", newMessage);

        //     } catch (error) {
        //         console.error("Database Error:", error);
        //     }
        // });
        socket.on("sendMessage", (messageData) => {
            console.log("Received message:", messageData);
            io.to(messageData.conversation_id).emit("receiveMessage", messageData);
        });
        socket.on("markAsRead", async ({ conversation_id, user_id, message_ids }) => {
            if (!conversation_id || !user_id) {
                console.error("markAsRead: Missing conversation_id or user_id");
                return;
            }

            try {
                let query;
                let params;

                if (message_ids && Array.isArray(message_ids) && message_ids.length > 0) {
                    const placeholders = message_ids.map(() => "?").join(",");
                    query = `
                        UPDATE MessageStatus 
                        SET is_read = TRUE, read_at = NOW() 
                        WHERE user_id = ? 
                        AND message_id IN (${placeholders}) 
                        AND is_read = FALSE
                    `;
                    params = [user_id, ...message_ids];
                } else {
                    query = `
                        UPDATE MessageStatus ms
                        JOIN Messages m ON ms.message_id = m.message_id
                        SET ms.is_read = TRUE, ms.read_at = NOW()
                        WHERE ms.user_id = ?
                        AND m.conversation_id = ?
                        AND ms.is_read = FALSE
                    `;
                    params = [user_id, conversation_id];
                }

                const [result] = await db.execute(query, params);

                if (result.affectedRows > 0) {
                    const [updatedMessages] = await db.execute(
                        `SELECT message_id FROM MessageStatus 
                         WHERE user_id = ? AND is_read = TRUE AND read_at IS NOT NULL`,
                        [user_id]
                    );
                    const updatedMessageIds = updatedMessages.map((row) => row.message_id);

                    io.to(conversation_id).emit("messageRead", {
                        message_ids: updatedMessageIds,
                        user_id,
                        conversation_id,
                    });
                    console.log(`Messages marked as read for user ${user_id} in conversation ${conversation_id}`);
                } else {
                    console.log(`No messages to mark as read for user ${user_id} in conversation ${conversation_id}`);
                }
            } catch (error) {
                console.error("Database Error (markAsRead):", error);
                socket.emit("error", { message: "Failed to mark messages as read" });
            }
        });

        socket.on("sendNotification", ({ receiver_id, notification }) => {
            const receiverSocket = onlineUsers.get(receiver_id);
            console.log(onlineUsers);
            if (receiverSocket) {
                io.to(receiverSocket).emit("notification", notification);
                console.log(`Notification sent to ${receiver_id}:`, notification);
            } else {
                console.log(`User ${receiver_id} is not online`);
            }
        });
        
        socket.on("disconnect", () => {
            for (let [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    onlineUsers.delete(userId);
                    console.log(`User ${userId} disconnected`);
                    break;
                }
            }
            console.log("User disconnected:", socket.id);
        });
    });

    return io;
};
module.exports.getIo = () => {
    return io; 
};