import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

plt.style.use('dark_background')
GOLD = '#D4AF37'
NAVY = '#0B1736'
BG = '#050B1A'
WHITE = '#FFFFFF'
GREEN = '#22C55E'
TEAL = '#14B8A6'
RED = '#EF4444'

fig_bg = '#0A0D1A'

# ─── CHART 1: Monthly Infrastructure Cost by Scale ───────────────────────────
scenarios = ['100 Users', '1,000 Users', '10,000 Users', '100,000 Users']

postgres   = [20, 50, 200, 800]
redis      = [0, 20, 100, 400]
infisical  = [0, 0, 18, 180]
fal_ai     = [150, 800, 4000, 20000]
suno       = [50, 250, 1500, 8000]
elevenlabs = [22, 99, 330, 1000]
openai     = [30, 120, 600, 2500]
modal      = [20, 80, 400, 2000]
vast_ai    = [0, 50, 200, 800]
storage    = [5, 20, 100, 500]
bandwidth  = [5, 20, 100, 400]
email      = [0, 10, 50, 200]
auth       = [0, 0, 50, 200]
monitoring = [0, 20, 50, 150]

totals = [sum(x) for x in zip(postgres, redis, infisical, fal_ai, suno, elevenlabs, openai, modal, vast_ai, storage, bandwidth, email, auth, monitoring)]

fig, ax = plt.subplots(figsize=(14, 8))
fig.patch.set_facecolor(fig_bg)
ax.set_facecolor(fig_bg)

x = np.arange(len(scenarios))
w = 0.5

bars_data = [
    (postgres,   '#5B8DEF', 'PostgreSQL'),
    (redis,      TEAL,      'Redis (Upstash)'),
    (infisical,  '#A78BFA', 'Infisical'),
    (fal_ai,     GOLD,      'FAL.ai'),
    (suno,       '#F97316', 'Suno'),
    (elevenlabs, '#EC4899', 'ElevenLabs'),
    (openai,     GREEN,     'OpenAI'),
    (modal,      '#06B6D4', 'Modal'),
    (vast_ai,    RED,       'Vast.ai'),
    (storage,    '#94A3B8', 'Storage/BW/Other'),
]

bottoms = np.zeros(len(scenarios))
for data, color, label in bars_data:
    # merge last 4 into storage for readability
    ax.bar(x, data, w, bottom=bottoms, color=color, label=label, alpha=0.92)
    bottoms += np.array(data)

# add "other" (email+auth+monitoring)
others = [a+b+c for a,b,c in zip(email, auth, monitoring)]
ax.bar(x, others, w, bottom=bottoms, color='#475569', label='Email/Auth/Monitor', alpha=0.92)
bottoms += np.array(others)

# total labels
for i, (t, b) in enumerate(zip(totals, bottoms)):
    ax.text(i, b + totals[3]*0.008, f'${t:,}', ha='center', va='bottom', color=GOLD, fontsize=11, fontweight='bold')

ax.set_xticks(x)
ax.set_xticklabels(scenarios, color=WHITE, fontsize=12)
ax.set_ylabel('Monthly Cost (USD)', color=WHITE, fontsize=12)
ax.set_title('Ghaafeedi Music — Infrastructure Cost by Scale', color=GOLD, fontsize=16, fontweight='bold', pad=20)
ax.tick_params(colors=WHITE)
ax.spines['bottom'].set_color('#334155')
ax.spines['left'].set_color('#334155')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f'${v:,.0f}'))
ax.legend(loc='upper left', framealpha=0.2, labelcolor=WHITE, fontsize=9, ncol=2)
ax.set_ylim(0, max(totals)*1.18)

plt.tight_layout()
plt.savefig('/home/user/ghaafeedi-music/PHASE2_REVIEW.report/chart-cost-by-scale.png', dpi=150, bbox_inches='tight', facecolor=fig_bg)
plt.close()

# ─── CHART 2: Cost vs Revenue per Scenario ─────────────────────────────────
fig, ax = plt.subplots(figsize=(12, 7))
fig.patch.set_facecolor(fig_bg)
ax.set_facecolor(fig_bg)

# Estimated revenue: avg order $180, members buy 1.5 products avg
avg_rev_per_user = 180
revenue = [100*avg_rev_per_user*0.4, 1000*avg_rev_per_user*0.5, 10000*avg_rev_per_user*0.55, 100000*avg_rev_per_user*0.6]
cost_total = [302, 1509, 7698, 36330]  # totals computed below

x = np.arange(len(scenarios))
w = 0.35

ax.bar(x - w/2, cost_total, w, color='#EF4444', alpha=0.85, label='Infra Cost')
ax.bar(x + w/2, revenue, w, color=GOLD, alpha=0.85, label='Estimated Revenue')

for i, (c, r) in enumerate(zip(cost_total, revenue)):
    margin = (r-c)/r*100 if r > 0 else 0
    ax.text(i, max(c,r)*1.04, f'{margin:.0f}%\nmargin', ha='center', va='bottom', color=GREEN, fontsize=9, fontweight='bold')

ax.set_xticks(x)
ax.set_xticklabels(scenarios, color=WHITE, fontsize=12)
ax.set_ylabel('USD / Month', color=WHITE, fontsize=12)
ax.set_title('Infrastructure Cost vs. Revenue Potential', color=GOLD, fontsize=15, fontweight='bold', pad=20)
ax.tick_params(colors=WHITE)
ax.spines['bottom'].set_color('#334155')
ax.spines['left'].set_color('#334155')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f'${v:,.0f}'))
ax.legend(framealpha=0.2, labelcolor=WHITE, fontsize=11)

plt.tight_layout()
plt.savefig('/home/user/ghaafeedi-music/PHASE2_REVIEW.report/chart-cost-vs-revenue.png', dpi=150, bbox_inches='tight', facecolor=fig_bg)
plt.close()

# ─── CHART 3: Provider Integration Priority & Role ─────────────────────────
fig, ax = plt.subplots(figsize=(13, 7))
fig.patch.set_facecolor(fig_bg)
ax.set_facecolor(fig_bg)

providers = ['FAL.ai', 'Suno', 'ElevenLabs', 'OpenAI', 'Modal', 'Vast.ai']
criticality = [95, 90, 70, 85, 60, 40]
cost_risk   = [80, 65, 45, 55, 50, 70]
phase       = [2, 2, 2, 2, 2, 2]

colors = [GOLD, '#F97316', '#EC4899', GREEN, '#06B6D4', RED]

scatter = ax.scatter(cost_risk, criticality, s=400, c=colors, zorder=5, edgecolors=WHITE, linewidths=1.5)

for i, p in enumerate(providers):
    ax.annotate(p, (cost_risk[i], criticality[i]), textcoords='offset points',
                xytext=(12, -4), color=WHITE, fontsize=11, fontweight='bold')

ax.set_xlabel('Cost / Operational Risk (Higher = Riskier)', color=WHITE, fontsize=12)
ax.set_ylabel('Business Criticality (Higher = More Critical)', color=WHITE, fontsize=12)
ax.set_title('Provider Integration Matrix: Criticality vs. Cost Risk', color=GOLD, fontsize=15, fontweight='bold', pad=20)
ax.tick_params(colors=WHITE)
for spine in ['bottom','left','top','right']:
    ax.spines[spine].set_color('#334155')
ax.set_xlim(25, 100)
ax.set_ylim(25, 105)
ax.axhline(70, color='#334155', linestyle='--', alpha=0.6, label='Criticality threshold')
ax.axvline(60, color='#334155', linestyle='--', alpha=0.6, label='Risk threshold')
ax.legend(framealpha=0.2, labelcolor=WHITE, fontsize=9)

plt.tight_layout()
plt.savefig('/home/user/ghaafeedi-music/PHASE2_REVIEW.report/chart-provider-matrix.png', dpi=150, bbox_inches='tight', facecolor=fig_bg)
plt.close()

# ─── CHART 4: DB Schema Relationships (simplified ER diagram) ───────────────
fig, ax = plt.subplots(figsize=(14, 9))
fig.patch.set_facecolor(fig_bg)
ax.set_facecolor(fig_bg)
ax.set_xlim(0, 14)
ax.set_ylim(0, 9)
ax.axis('off')

tables = [
    ('members',         1.0,  7.5, GOLD),
    ('subscriptions',   4.0,  7.5, TEAL),
    ('orders',          7.0,  7.5, '#5B8DEF'),
    ('ai_jobs',         1.0,  4.5, '#F97316'),
    ('billing_events',  4.5,  4.5, GREEN),
    ('audit_logs',      8.0,  4.5, '#A78BFA'),
    ('provider_usage',  1.0,  1.5, '#EC4899'),
    ('webhooks',        5.0,  1.5, '#06B6D4'),
    ('routing_rules',   9.5,  1.5, '#94A3B8'),
    ('profiles',        11.0, 7.5, '#F59E0B'),
]

box_w, box_h = 2.2, 0.7
for name, cx, cy, color in tables:
    rect = mpatches.FancyBboxPatch((cx - box_w/2, cy - box_h/2), box_w, box_h,
        boxstyle='round,pad=0.1', linewidth=1.5, edgecolor=color, facecolor=fig_bg)
    ax.add_patch(rect)
    ax.text(cx, cy, name, ha='center', va='center', color=color, fontsize=9, fontweight='bold')

# draw edges (simplified)
edges = [
    ('members', 'subscriptions'), ('members', 'orders'), ('members', 'ai_jobs'),
    ('orders', 'billing_events'), ('ai_jobs', 'billing_events'),
    ('ai_jobs', 'provider_usage'), ('ai_jobs', 'audit_logs'),
    ('orders', 'audit_logs'), ('ai_jobs', 'routing_rules'),
    ('members', 'profiles'), ('webhooks', 'billing_events'),
]
pos = {n: (cx, cy) for n, cx, cy, _ in tables}
for a, b in edges:
    ax.annotate('', xy=pos[b], xytext=pos[a],
        arrowprops=dict(arrowstyle='->', color='#334155', lw=1.5, connectionstyle='arc3,rad=0.1'))

ax.set_title('PostgreSQL Schema — Table Relationships', color=GOLD, fontsize=15, fontweight='bold', y=0.98)
plt.tight_layout()
plt.savefig('/home/user/ghaafeedi-music/PHASE2_REVIEW.report/chart-schema-er.png', dpi=150, bbox_inches='tight', facecolor=fig_bg)
plt.close()

# ─── CHART 5: Scaling Milestones Timeline ────────────────────────────────────
fig, ax = plt.subplots(figsize=(14, 5))
fig.patch.set_facecolor(fig_bg)
ax.set_facecolor(fig_bg)

milestones = ['Launch\n(0-100)', '1K Users', '5K Users', '10K Users', '50K Users', '100K+ Users']
x_pos = [0, 1, 2, 3, 4, 5]
costs = [302, 1509, 4200, 7698, 20000, 36330]

colors_m = [GREEN, TEAL, GOLD, '#F97316', '#EC4899', RED]

ax.plot(x_pos, costs, color=GOLD, linewidth=2.5, zorder=3, alpha=0.6)
ax.scatter(x_pos, costs, s=180, c=colors_m, zorder=5, edgecolors=WHITE, linewidths=1.5)

for i, (m, c) in enumerate(zip(milestones, costs)):
    ax.annotate(f'${c:,}/mo', (i, c), textcoords='offset points',
                xytext=(0, 14), ha='center', color=WHITE, fontsize=9, fontweight='bold')

infra_notes = [
    'Single PG + Redis Free', 'PgBouncer + Redis Paid', 'Read Replica added',
    'Partitioning + CDN', 'PG cluster + Redis cluster', 'Multi-region HA'
]
for i, note in enumerate(infra_notes):
    ax.text(i, -4000, note, ha='center', va='top', color='#64748B', fontsize=7.5, style='italic')

ax.set_xticks(x_pos)
ax.set_xticklabels(milestones, color=WHITE, fontsize=10)
ax.set_ylabel('Monthly Infra Cost (USD)', color=WHITE, fontsize=11)
ax.set_title('Infrastructure Scaling Milestones', color=GOLD, fontsize=15, fontweight='bold', pad=20)
ax.tick_params(colors=WHITE)
ax.spines['bottom'].set_color('#334155')
ax.spines['left'].set_color('#334155')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f'${v:,.0f}'))
ax.set_ylim(-8000, max(costs)*1.2)

plt.tight_layout()
plt.savefig('/home/user/ghaafeedi-music/PHASE2_REVIEW.report/chart-scaling-milestones.png', dpi=150, bbox_inches='tight', facecolor=fig_bg)
plt.close()

print("All 5 charts generated.")
