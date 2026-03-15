interface TrustSummaryInput {
  keywords: string[]
  revisitRate30d: number
}

export interface SceneParams {
  cuisine: string
  budget: string
  distance: string
}

export interface SupplementalPlace {
  name: string
  campusId: string
  address: string
  lng: number
  lat: number
  revisitRate30d: number
  aiSummary: string
  aiReason: string
  tags: string[]
  avgPrice: number
  rating: number
  signatureDishes: string[]
}

export type AiProvider = 'noop' | 'domestic-http' | 'deepseek'

export interface AiAdapter {
  getProvider(): AiProvider
  parseSceneParams(input: string): Promise<SceneParams>
  extractIntentHints(input: string): Promise<string[]>
  summarizeTrust(input: TrustSummaryInput): Promise<string>
  generateSupplementPlaces(cuisine: string): Promise<SupplementalPlace[]>
}

interface AiConfig {
  endpoint?: string
  apiKey?: string
  model?: string
  timeoutMs: number
}

const emptySceneParams: SceneParams = {
  cuisine: '',
  budget: '',
  distance: '',
}

const knownCuisines = [
  '安徽菜',
  '徽菜',
  '上海菜',
  '本帮菜',
  '江浙菜',
  '川菜',
  '湘菜',
  '粤菜',
  '东北菜',
  '火锅',
  '烧烤',
  '麻辣烫',
  '轻食',
  '甜品',
  '面食',
]

const safeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

const normalizeJsonText = (raw: string): string =>
  raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

const parseScenePayload = (raw: string): SceneParams => {
  const normalized = normalizeJsonText(raw)
  if (!normalized) {
    return { ...emptySceneParams }
  }

  try {
    const parsed = JSON.parse(normalized) as Record<string, unknown>
    return {
      cuisine: safeString(parsed.cuisine),
      budget: safeString(parsed.budget),
      distance: safeString(parsed.distance),
    }
  } catch {
    return { ...emptySceneParams }
  }
}

const parseSupplementPayload = (raw: string): SupplementalPlace[] => {
  const normalized = normalizeJsonText(raw)
  if (!normalized) {
    return []
  }

  try {
    const parsed = JSON.parse(normalized) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item) => {
        const row = item as Record<string, unknown>
        const lng = Number(row.lng)
        const lat = Number(row.lat)
        const revisitRate30d = Number(row.revisitRate30d)
        const avgPrice = Number(row.avgPrice)
        const rating = Number(row.rating)

        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          return null
        }

        const tags = Array.isArray(row.tags)
          ? row.tags.map((entry) => safeString(entry)).filter((entry) => entry.length > 0)
          : []

        const signatureDishes = Array.isArray(row.signatureDishes)
          ? row.signatureDishes
              .map((entry) => safeString(entry))
              .filter((entry) => entry.length > 0)
              .slice(0, 4)
          : []

        const campusIdRaw = safeString(row.campusId)
        const address = safeString(row.address)
        const aiReason = safeString(row.ai_reason) || safeString(row.aiReason)
        const inferredCampusId =
          campusIdRaw || (address.includes('虎泉') || address.includes('华中师范') ? 'ccnu' : 'wuhan-university')

        return {
          name: safeString(row.name),
          campusId: inferredCampusId,
          address,
          lng,
          lat,
          revisitRate30d: Number.isFinite(revisitRate30d)
            ? Math.max(20, Math.min(90, Math.round(revisitRate30d)))
            : 52,
          aiSummary: safeString(row.aiSummary),
          aiReason: aiReason || '口味相近，且在大学城步行范围内，便于快速就餐。',
          tags,
          avgPrice: Number.isFinite(avgPrice) ? Math.max(16, Math.min(120, Math.round(avgPrice))) : 42,
          rating: Number.isFinite(rating) ? Math.max(3.8, Math.min(4.9, Number(rating.toFixed(1)))) : 4.4,
          signatureDishes,
        } satisfies SupplementalPlace
      })
      .filter((item): item is SupplementalPlace =>
        Boolean(item && item.name.length > 0 && item.aiSummary.length > 0 && item.aiReason.length > 0),
      )
      .slice(0, 4)
  } catch {
    return []
  }
}

const hardcodedHuicaiPlaces: SupplementalPlace[] = [
  {
    name: '徽州人家（广八路店）',
    campusId: 'wuhan-university',
    address: '武汉大学广八路口（近群光）',
    lng: 114.3709,
    lat: 30.5421,
    revisitRate30d: 56,
    aiSummary: '主打臭鳜鱼和笋干烧肉，徽菜风味明显，学生聚餐回头率稳定。',
    aiReason: '这家以臭鳜鱼和笋干烧肉为主，风味特征与安徽菜高度一致，命中率高。',
    tags: ['安徽菜', '徽菜', '聚餐', '咸鲜口'],
    avgPrice: 46,
    rating: 4.5,
    signatureDishes: ['黄山臭鳜鱼', '笋干烧肉'],
  },
  {
    name: '皖厨小馆（虎泉店）',
    campusId: 'ccnu',
    address: '华中师范大学虎泉街区（近地铁站）',
    lng: 114.3539,
    lat: 30.5238,
    revisitRate30d: 53,
    aiSummary: '虎泉片区热门徽菜小馆，毛豆腐和一品锅讨论度高，复购表现稳定。',
    aiReason: '虽然店面不大，但毛豆腐与一品锅都偏徽菜经典路线，适合“想吃徽菜”的需求。',
    tags: ['安徽菜', '徽菜', '虎泉', '朋友局'],
    avgPrice: 39,
    rating: 4.4,
    signatureDishes: ['毛豆腐', '徽州一品锅'],
  },
]

const hardcodedShanghainesePlaces: SupplementalPlace[] = [
  {
    name: '沪上小馆（广八路店）',
    campusId: 'wuhan-university',
    address: '武汉大学广八路与珞狮路交界',
    lng: 114.3702,
    lat: 30.5412,
    revisitRate30d: 51,
    aiSummary: '主打红烧肉、葱油拌面，口味偏甜咸，接近本帮菜的核心风格。',
    aiReason: '虽然不是纯上海老字号，但甜咸平衡和红烧系做法很有“上海味道”。',
    tags: ['上海菜', '本帮风味', '红烧肉', '面食'],
    avgPrice: 45,
    rating: 4.4,
    signatureDishes: ['本帮红烧肉', '葱油拌面'],
  },
  {
    name: '江南本味（虎泉店）',
    campusId: 'ccnu',
    address: '华师虎泉街区（近地铁站）',
    lng: 114.3543,
    lat: 30.5232,
    revisitRate30d: 49,
    aiSummary: '江浙口偏清甜，油爆虾和响油鳝糊讨论度高，聚餐接受度好。',
    aiReason: '若本地缺少纯上海菜，这家江浙本帮取向最接近“上海菜”口感习惯。',
    tags: ['上海菜近似', '江浙菜', '甜口', '朋友聚餐'],
    avgPrice: 52,
    rating: 4.5,
    signatureDishes: ['油爆虾', '响油鳝糊'],
  },
]

class NoopAiAdapter implements AiAdapter {
  getProvider(): AiProvider {
    return 'noop'
  }

  async parseSceneParams(input: string): Promise<SceneParams> {
    const text = input.trim()
    if (!text) {
      return { ...emptySceneParams }
    }

    const cuisine = knownCuisines.find((term) => text.includes(term)) ?? ''
    const budgetMatched = text.match(/(\d{1,3})\s*(元|块|rmb|¥)?/i)
    const distanceMatched = text.match(/(\d{1,3})\s*(分钟|分|公里|km|米|m)/i)

    return {
      cuisine,
      budget: budgetMatched ? `${budgetMatched[1]}元` : '',
      distance: distanceMatched ? `${distanceMatched[1]}${distanceMatched[2]}` : '',
    }
  }

  async extractIntentHints(input: string): Promise<string[]> {
    const parsed = await this.parseSceneParams(input)
    return [parsed.cuisine, parsed.budget, parsed.distance].filter((item) => item.length > 0)
  }

  async summarizeTrust(input: TrustSummaryInput): Promise<string> {
    const keywordLine = input.keywords.slice(0, 2).join('、') || '口碑稳定'
    return `多人提到${keywordLine}，近30天回头率 ${input.revisitRate30d}%`
  }

  async generateSupplementPlaces(cuisine: string): Promise<SupplementalPlace[]> {
    if (cuisine.includes('上海') || cuisine.includes('本帮') || cuisine.includes('江浙')) {
      return hardcodedShanghainesePlaces
    }
    if (cuisine.includes('安徽') || cuisine.includes('徽')) {
      return hardcodedHuicaiPlaces
    }
    return []
  }
}

class DomesticHttpAiAdapter implements AiAdapter {
  constructor(private readonly config: AiConfig) {}

  getProvider(): AiProvider {
    return 'domestic-http'
  }

  private async callApi(task: string, content: string): Promise<string | null> {
    if (!this.config.endpoint || !this.config.apiKey) {
      return null
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model ?? 'default',
          task,
          content,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        return null
      }

      const payload = (await response.json()) as { text?: string }
      return payload.text?.trim() ?? null
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  async parseSceneParams(input: string): Promise<SceneParams> {
    const result = await this.callApi(
      'scene-parse',
      `请把这段用户描述转成 JSON，字段是 cuisine/budget/distance，只返回 JSON：${input}`,
    )

    if (!result) {
      return { ...emptySceneParams }
    }

    return parseScenePayload(result)
  }

  async extractIntentHints(input: string): Promise<string[]> {
    const parsed = await this.parseSceneParams(input)
    return [parsed.cuisine, parsed.budget, parsed.distance].filter((item) => item.length > 0)
  }

  async summarizeTrust(input: TrustSummaryInput): Promise<string> {
    const fallback = `多人提到${input.keywords.slice(0, 2).join('、')}，近30天回头率 ${input.revisitRate30d}%`
    const prompt = `请用一句中文口语化表达总结这家店可信度。关键词：${input.keywords.join('、')}；30天回头率：${input.revisitRate30d}%`
    const result = await this.callApi('trust-summary', prompt)
    return result ?? fallback
  }

  async generateSupplementPlaces(cuisine: string): Promise<SupplementalPlace[]> {
    const result = await this.callApi(
      'supplement-places',
      `若本地库缺少“${cuisine}”直接匹配，请给出武汉大学广八路或华师虎泉附近最接近该风格的2家店。字段：name,campusId,address,lng,lat,revisitRate30d,aiSummary,ai_reason,tags,avgPrice,rating,signatureDishes。只返回 JSON 数组。`,
    )

    if (!result) {
      return []
    }

    return parseSupplementPayload(result)
  }
}

interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

class DeepSeekAiAdapter implements AiAdapter {
  constructor(private readonly config: AiConfig) {}

  getProvider(): AiProvider {
    return 'deepseek'
  }

  private async callChat(messages: DeepSeekChatMessage[], maxTokens: number): Promise<string | null> {
    if (!this.config.apiKey) {
      return null
    }

    const endpoint = this.config.endpoint?.trim() || 'https://api.deepseek.com/chat/completions'
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model?.trim() || 'deepseek-chat',
          temperature: 0.2,
          max_tokens: maxTokens,
          messages,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        return null
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      return payload.choices?.[0]?.message?.content?.trim() ?? null
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  async parseSceneParams(input: string): Promise<SceneParams> {
    const text = input.trim()
    if (!text) {
      return { ...emptySceneParams }
    }

    const result = await this.callChat(
      [
        {
          role: 'system',
          content:
            '你是一个懂心意的大学城美食导游。用户输入可能很不完整（如：只说“想吃甜的”或“上海菜”）。推理任务：无论用户输入多简短，你必须提取出核心关键词。如果只说菜系，就按菜系搜；如果只说口味，就按口味搜。请将结果转成 JSON，字段限定为 cuisine, budget, distance。只返回 JSON，不要任何解释。',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      160,
    )

    if (!result) {
      return { ...emptySceneParams }
    }

    return parseScenePayload(result)
  }

  async extractIntentHints(input: string): Promise<string[]> {
    const parsed = await this.parseSceneParams(input)
    return [parsed.cuisine, parsed.budget, parsed.distance].filter((item) => item.length > 0)
  }

  async summarizeTrust(input: TrustSummaryInput): Promise<string> {
    const fallback = `多人提到${input.keywords.slice(0, 2).join('、') || '口碑稳定'}，近30天回头率 ${input.revisitRate30d}%`

    const prompt = `请基于以下信息写一句 30 字以内中文总结：关键词：${input.keywords.join('、')}；30天回头率：${input.revisitRate30d}%。只输出一句话。`
    const result = await this.callChat(
      [
        { role: 'system', content: '你是校园美食产品的文案助手。' },
        { role: 'user', content: prompt },
      ],
      90,
    )

    return result ? normalizeJsonText(result) : fallback
  }

  async generateSupplementPlaces(cuisine: string): Promise<SupplementalPlace[]> {
    const prompt = `本地餐厅库可能没有与“${cuisine}”直接匹配的店。请在“武汉大学广八路”或“华师虎泉”附近，推荐 2 家最接近该风格的餐厅。\n要求：\n1) 优先真实店名和真实坐标；\n2) 若无完全匹配，可推荐相近风格；\n3) 必须给出 ai_reason 解释推荐理由。\n仅输出 JSON 数组，每个对象字段：name,campusId,address,lng,lat,revisitRate30d,aiSummary,ai_reason,tags,avgPrice,rating,signatureDishes。\ncampusId 只能是 wuhan-university 或 ccnu。`

    const result = await this.callChat(
      [
        {
          role: 'system',
          content:
            '你是一个懂心意的大学城美食导游。用户输入可能很不完整。若本地库没有直接匹配，请用相近风格补偿推荐，并在 ai_reason 里解释“为什么它接近用户想吃的味道”。只返回可解析 JSON。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      600,
    )

    if (!result) {
      return []
    }

    return parseSupplementPayload(result)
  }
}

export const createAiAdapter = (): AiAdapter => {
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS ?? '1400')

  const deepSeekKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (deepSeekKey) {
    return new DeepSeekAiAdapter({
      apiKey: deepSeekKey,
      endpoint: process.env.DEEPSEEK_API_ENDPOINT,
      model: process.env.DEEPSEEK_MODEL,
      timeoutMs,
    })
  }

  const endpoint = process.env.AI_API_ENDPOINT
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL

  if (endpoint && apiKey) {
    return new DomesticHttpAiAdapter({ endpoint, apiKey, model, timeoutMs })
  }

  return new NoopAiAdapter()
}
