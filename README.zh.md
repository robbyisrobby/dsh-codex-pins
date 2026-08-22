# dsh-codex-pins

[English](README.md) | 中文

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 做 **Codex 那样的会话置顶**：已置顶的会话直接铺在侧边栏会话列表上面，不用再点一次底栏按钮。

```
┌─ 侧边栏 ──────────────────────┐
│  新会话                       │
│                               │
│  置顶                         │
│    📌 修登录流程          3小时 │
│    📌 周报                2天  │
│                               │
│  工作区 / 最近会话             │
│    …                          │
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
3. 置顶会出现在列表最上方的 **置顶** 分组。点行打开，再点图钉取消。

## 为什么自己写

社区现有的置顶插件要么把会话挤到工作区内部排序，要么藏在底栏「已置顶」面板里，还要再点一次。Codex / ChatGPT 是顶部常驻分组。这个插件就做这一件事。

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

## License

MIT
