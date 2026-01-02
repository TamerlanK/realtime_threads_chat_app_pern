# 🧵 ChatApp — Real-Time Threads & Messaging Platform

A full-stack web application that lets users authenticate, create and participate in threaded discussions, chat in real time, and receive live notifications.

Built with **Next.js**, **Node.js (Express)**, **PostgreSQL**, **Socket.IO**, **Clerk authentication**, and **Docker**.

---

## ✨ Features

### 🔐 Authentication & User Management

- Secure authentication with **Clerk**
- User profiles with editable display information
- Protected routes (frontend + backend)

### 🧵 Threads & Categories

- Create threads under different categories
- View and reply to threads
- Real-time updates when new replies are added

### 💬 Real-Time Chat

- Direct messaging between users
- Image support in messages
- Typing indicators
- Online / offline presence

### 🔔 Notifications

- Real-time notifications using **Socket.IO**
- Instant updates for messages, replies, and activity

### ⚡ Real-Time Infrastructure

- WebSockets powered by **Socket.IO**
- Persistent connections with reconnect handling

---

## 🛠 Tech Stack

### Frontend

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Clerk** for authentication
- **Socket.IO Client**

### Backend

- **Node.js**
- **Express**
- **TypeScript**
- **Socket.IO**
- **PostgreSQL**
- REST API + WebSockets

### Database

- **PostgreSQL** (Dockerized)
