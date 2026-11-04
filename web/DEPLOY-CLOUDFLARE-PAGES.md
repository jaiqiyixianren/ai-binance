# Cloudflare Pages 部署（BPKM 前端）

## 你需要准备

1. [GitHub](https://github.com) 账号  
2. [Cloudflare](https://dash.cloudflare.com) 账号（免费）  
3. 本仓库已 push 到 GitHub（见根目录 `README` 或下方命令）

## 一、把代码推到 GitHub（只需做一次）

在仓库根目录：

```powershell
git remote add origin https://github.com/你的用户名/ai-binance.git
git push -u origin main
```

（仓库名可自定；Pages 连的是 GitHub 里的这份代码。）

## 二、创建 Pages 项目

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**  
2. 授权 GitHub，选中仓库 `ai-binance`（或你的仓库名）  
3. **Set up builds and deployments**：

| 项 | 填什么 |
|----|--------|
| Production branch | `main` |
| Root directory | `web` |
| Framework preset | `Vite`（或 None 也行） |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |

4. **Environment variables**（Production）— 点 **Add variable**，逐条添加：

| Name | Value |
|------|--------|
| `VITE_MINT_ADDRESS` | `0x98BaFFc1f6f767405c7683bFcC86063fd8Ef3163` |
| `VITE_TOKEN_ADDRESS` | `0x7A0318169CFf59108Dc2a5E2df1fc971437e4B1c` |
| `VITE_MINT_FROM_BLOCK` | `131675861` |
| `VITE_BSC_RPC` | `https://bsc-dataseed.binance.org` |
| `VITE_SITE_URL` | 先填 `https://<项目名>.pages.dev`，绑自定义域名后再改 |

5. **Save and Deploy**，等 2～5 分钟。

成功后会得到：`https://<项目名>.pages.dev`

## 三、自定义域名（可选，建议）

1. 在 Cloudflare **Registrar** 或别处购买域名（如 `bpkm.io`）  
2. 若域名已在 Cloudflare：**Websites** → 你的域名 → 或 Pages 项目 → **Custom domains** → **Set up a custom domain**  
3. 按提示添加 DNS（通常自动 CNAME 到 Pages）  
4. 回到 Pages → **Settings** → **Environment variables**，把 `VITE_SITE_URL` 改成 `https://你的域名`，**Redeploy** 一次。

## 四、以后更新网站

```powershell
git add -A
git commit -m "update web"
git push
```

Pages 会自动重新构建（可在 Dashboard 看 Deployments）。

## 说明

- `public/_redirects`：Vue 路由 `/guide` 等刷新不 404  
- 构建会生成 `dist/_headers`（安全头）  
- 不要把 `.env` 提交到 Git；只在 Cloudflare 面板填变量  
