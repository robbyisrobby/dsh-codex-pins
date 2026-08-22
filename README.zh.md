# dsh-codex-pins

[English](README.md) | 中文

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 做 **Codex 那样的会话置顶**：侧边栏分成 **置顶**、**最近** 两栏，各自滚动；置顶过的会话不会再出现在「最近」里。

```
┌─ 侧边栏 ──────────────────────┐
│  新会话                       │
│                               │
│  置顶                         │
│    📌 修登录流程          3小时 │
│    📌 周报                2天  │
│  ───────────────────────────  │
│  最近                         │
│    其他会话…                  │
└───────────────────────────────┘
```

## 安装

```sh
dsh plugin --profile web add github:robbyisrobby/dsh-codex-pins
dsh plugin --profile desktop add github:robbyisrobby/dsh-codex-pins
```

重启 DeepSeek Harness（或 DSH Desktop）后：

1. 鼠标移到会话行，点图钉。
2. 或者打开会话后，点标题栏图钉。
3. 侧边栏上面是 **置顶**，下面是 **最近**。点置顶行打开；再点图钉会回到「最近」。

## 为什么自己写

社区现有的置顶插件要么把会话挤到工作区内部排序，要么藏在底栏「已置顶」面板里，还要再点一次。Codex / ChatGPT 是置顶和最近分成两栏。这个插件就做这一件事。

## 行为

- 后置顶的排在最前。
- 名单存在当前源的 `localStorage`（`dsh-codex-pins.v1`）。
- 如果以前装过 `dsh-session-pin`，会把本地置顶名单导入一次。
- 最多 50 条；会话目录就绪后会清掉已经不存在的 id。
- 纯 UI：不发模型请求、不开 Host HTTP、不读会话日志、没有 install 脚本。

## 卸载

```sh
dsh plugin --profile desktop remove dsh-codex-pins
dsh plugin --profile web remove dsh-codex-pins
```

## 插件市场

dsh-market 以及跟 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 的商店，会在目录收录后出现这条。安装标识是 `github:robbyisrobby/dsh-codex-pins`。

## License

MIT
