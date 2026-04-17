import { ReactNode } from 'react';
import { ShieldCheck, LockKeyhole, Ban, X } from 'lucide-react';

export type LegalSection = 'permissions' | 'privacy' | 'anti-theft';

interface LegalCenterProps {
  activeSection: LegalSection;
  open: boolean;
  onClose: () => void;
  onChangeSection: (section: LegalSection) => void;
}

const sections: Array<{
  id: LegalSection;
  label: string;
  icon: ReactNode;
  title: string;
  lead: string;
  items: string[];
}> = [
  {
    id: 'permissions',
    label: '使用权限',
    icon: <ShieldCheck size={18} />,
    title: '使用权限与适用范围',
    lead:
      '本系统面向失眠相关评估、睡眠记录、治疗任务管理与康复追踪使用，定位为临床辅助管理与患者自我管理工具。',
    items: [
      '系统内容、品牌标识、界面设计与说明文案，均用于陕西省中医医院脑病科相关临床辅助和患者教育场景。',
      '患者和授权使用者可在医生指导、院内管理或个人康复记录范围内使用本系统，不得擅自将系统包装为独立诊断工具对外提供医疗承诺。',
      '未经书面授权，不得复制、修改、镜像、二次分发、商业售卖或将本系统内容用于与本项目无关的平台展示。',
      '本系统提供的信息仅作为辅助理解和自我管理参考，不替代医生面对面诊疗、急症处理或正式医疗文书。',
    ],
  },
  {
    id: 'privacy',
    label: '隐私声明',
    icon: <LockKeyhole size={18} />,
    title: '隐私与数据说明',
    lead:
      '我们尽量以克制、必要的方式处理睡眠记录与测评信息，帮助你完成记录、评估、任务推荐与恢复追踪。',
    items: [
      '当前站点默认将睡眠日志、PSQI、DBAS、任务反馈等数据保存在浏览器本地存储中，用于你本人持续查看和管理。',
      '若启用 AI 增强任务推荐，系统可能将与任务生成相关的结构化睡眠与测评摘要发送给对应服务；未启用时会回退到本地规则推荐，并向用户明确提示。',
      '请勿在备注或自由输入中填写与治疗无关的身份证号、银行卡号、社交账号、详细住址等不必要敏感信息。',
      '你可以随时清空示例数据、切换到真实记录模式，或导出当前数据留存备份；如在共享设备上使用，请在结束后及时清理本地数据。',
      '本系统不以“自动诊断”为目的展示结果，所有分析结论均应结合医生判断、病史与临床随访综合理解。',
    ],
  },
  {
    id: 'anti-theft',
    label: '禁止盗用',
    icon: <Ban size={18} />,
    title: '禁止盗取、盗用与不当使用声明',
    lead:
      '为了保护医疗机构品牌、公信力与患者相关信息安全，任何未经授权的抓取、仿冒、搬运和二次利用行为均被明确禁止。',
    items: [
      '禁止以爬虫、脚本、接口仿造、页面镜像等方式批量抓取系统页面、代码、图表、文案、品牌标识或患者相关数据。',
      '禁止冒用“陕西省中医医院脑病科”名义，伪造、搬运或篡改本系统内容用于宣传、引流、商业变现或误导性医疗场景。',
      '禁止绕过、试探、破坏系统的访问控制、部署配置、日志与数据边界，也不得传播任何用于规避安全措施的方法。',
      '如发现盗取、盗用、篡改、倒卖或其他损害机构与用户权益的行为，相关方保留暂停服务、追究责任与依法维权的权利。',
    ],
  },
];

export function LegalCenter({ activeSection, open, onClose, onChangeSection }: LegalCenterProps) {
  if (!open) {
    return null;
  }

  const current = sections.find((section) => section.id === activeSection) ?? sections[0];

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-slate-950/72 px-4 py-4 backdrop-blur-sm sm:items-center sm:px-6">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,19,32,0.98),rgba(12,22,37,0.98))] shadow-[0_40px_120px_rgba(2,6,23,0.55)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8">
          <div className="space-y-2">
            <p className="text-sm font-medium tracking-[0.14em] text-sky-200/80">使用说明中心</p>
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">权限、隐私与禁止盗用说明</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">
                适用于陕西省中医医院脑病科 Somnus CBT-I 睡眠认知行为疗法数字干预系统。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/74 transition hover:bg-white/10"
            aria-label="关闭说明"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[calc(92vh-96px)] overflow-y-auto lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r lg:p-5">
            <div className="grid gap-2">
              {sections.map((section) => {
                const active = section.id === current.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => onChangeSection(section.id)}
                    className={`flex items-start gap-3 rounded-2xl px-4 py-4 text-left transition ${
                      active ? 'bg-sky-300 text-slate-950' : 'bg-white/4 text-white/75 hover:bg-white/8'
                    }`}
                  >
                    <span className="mt-0.5">{section.icon}</span>
                    <span>
                      <span className="block text-sm font-semibold">{section.label}</span>
                      <span className={`mt-1 block text-xs leading-6 ${active ? 'text-slate-900/75' : 'text-white/48'}`}>
                        点击查看对应说明
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="px-5 py-5 sm:px-8 sm:py-7">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
                {current.icon}
                {current.label}
              </p>
              <h3 className="mt-4 text-2xl font-semibold text-white">{current.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/68 sm:text-base">{current.lead}</p>
              <div className="mt-5 grid gap-3">
                {current.items.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-4 text-sm leading-7 text-white/76 sm:text-[15px]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs leading-6 text-white/42">
              更新时间：2026-04-17。若后续涉及正式临床流程、账户体系或云端存储接入，应同步补充更完整的机构级合规文档。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
