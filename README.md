# 🚀 Noah — Production-Ready Golang Backend + Admin Panel

> Stop rebuilding backend boilerplate. Ship faster with a real system.

---

## 🔥 What is Noah?

Noah is a **production-ready backend system** built with Golang, designed for developers who want to:

* Skip weeks of setup
* Avoid messy architecture
* Start building real features immediately

It includes:

* ✅ Modular architecture (plug & play modules)
* ✅ Authentication (JWT + Refresh Token)
* ✅ Authorization (RBAC-ready)
* ✅ Redis caching layer
* ✅ PostgreSQL + Ent ORM
* ✅ Flyway migration system
* ✅ Circuit Breaker + Retry middleware
* ✅ API Gateway + module system
* ✅ Admin panel (FE)

This is not a starter template.
This is a **real system you can build on top of.**

---

## ⚡ Why Noah exists

Most backend templates are:

* Too simple → useless in real projects
* Too complex → impossible to understand
* Not opinionated → you waste time deciding everything

👉 Noah solves this by giving you a **balanced, production-grade foundation**

---

## 🧠 Architecture Overview

```text
/
├── api/
│   ├── main.go
│   ├── gateway/
│   ├── modules/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── profile/
│   │   ├── rbac/
│   │   └── ...
│   ├── shared/
│   │   ├── app/
│   │   ├── auth/
│   │   ├── cache/
│   │   ├── circuitbreaker/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── redis/
│   │   └── runtime/
│   ├── migrations/
│   ├── scripts/
│   ├── docker-compose.yml
│   └── Makefile
├── fe/
│   ├── src/
│   │   ├── app/
│   │   ├── core/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── shared/
│   │   └── store/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
└── AGENTS.md
```

### Key Design Principles

* DRY (no duplicated logic)
* SOLID (clean, scalable design)
* Modular (each module runs independently)
* Production-first (not tutorial code)

---

## 🧩 Core Features

### 🔐 Authentication System

* JWT Access Token (short-lived)
* Refresh Token (stored in PostgreSQL)
* Auto cleanup with cron job

---

### 🧱 Modular System

* Each module:

  * has its own `main.go`
  * can run independently
  * plug into API Gateway

---

### ⚡ Cache Layer

* Redis (multi-instance ready)
* Memory + Redis hybrid caching
* Auto invalidate on update/delete

---

### 🛡️ Stability Layer

* Circuit Breaker (global)
* Retry middleware
* Fallback via cache

---

### 🗄️ Database

* PostgreSQL
* Ent ORM (for CRUD)
* Raw SQL (for performance-critical queries)
* Flyway for migration control

---

### 🌐 API System

* Fiber framework
* Custom HTTP wrapper:

  * `app.Get()`
  * `app.Post()`
  * auto integrated:

    * retry
    * circuit breaker

---

## 🖥️ Admin Panel

* Manage system data
* Interact with backend APIs
* Extendable UI

---

## 🚀 Quick Start

```bash
git clone <repo>
cd noah

# run backend
cd api
make docker-up

# run admin panel
cd fe
bun install
bun run dev
```

---

## 🧪 Example Use Cases

* SaaS backend
* Internal tools
* Marketplace systems
* Microservice foundation
* API platform

---

## ❗ Who is this for?

This is NOT for beginners.

This is for developers who:

* Already know backend basics
* Want a real system, not tutorials
* Care about architecture and scalability

---

## 🧠 Philosophy

> Developers don’t buy code.
> They buy **time, clarity, and confidence.**

Noah is built to give you all three.

---

## 📩 Support

If you have questions:

* Open an issue
* Or contact via [LinkedIn](https://www.linkedin.com/in/iamkhiem), [Email](mailto:khiemnd777@gmail.com).

---

## ⭐ If this helps you

Give it a star. It helps a lot.
