// scripts/import-champion-meta.ts
// 从 Data Dragon API 拉取最新英雄列表并生成 champion-meta.json
// 运行: npx tsx scripts/import-champion-meta.ts

async function main() {
  const versionUrl = 'https://ddragon.leagueoflegends.com/api/versions.json'
  const versions: string[] = await fetch(versionUrl).then(r => r.json())
  const latestVersion = versions[0]

  const champUrl = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/zh_CN/champion.json`
  const data = await fetch(champUrl).then(r => r.json())

  const champions: Record<string, { name: string; enName: string; positions: string[] }> = {}
  for (const champ of Object.values(data.data) as Array<{ key: string; name: string; id: string; tags: string[] }>) {
    champions[champ.key] = {
      name: champ.name,
      enName: champ.id,
      positions: champ.tags.map(t => t.toLowerCase()),
    }
  }

  const output = {
    champions,
    positionOrder: ['top', 'jungle', 'mid', 'bot', 'utility'],
    positionLabels: {
      top: '上路', jungle: '打野', mid: '中路', bot: '下路', utility: '辅助'
    },
    damageTypes: {} as Record<string, string>
  }

  const fs = await import('node:fs')
  fs.writeFileSync('src/data/champion-meta.json', JSON.stringify(output, null, 2))
  console.log(`Written ${Object.keys(champions).length} champions to champion-meta.json`)
}

main()
