# QQ101 响应 fixtures

采集时间：2026-10-08，国服 patch 16.19。来源：https://mlol.qt.qq.com

- `versionlist.json` — GET /go/database/versionlist?zone=lol&from=h5
- `tierlist-all.json` — GET /go/battle_info/odp_proxy/lol_101strategy?itier=255&version_id=16.19&lane=ALL&sort_metric=1&sort_order=2
- `confront-84-middle.json` — GET .../lol_101strategy_confront?itier=255&version_id=16.19&lane=MIDDLE&championid=84（阿卡丽中路对位）
- `partner-84-middle.json` — GET .../lol_101strategy_partner?itier=255&version_id=16.19&lane=MIDDLE&championid=84（阿卡丽中路协同）

注意：上游数据随时间变化，这些文件只用于解析器回归测试，断言数值以采集快照为准。
