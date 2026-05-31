// 你的 eSIM 列表数据（集中在此处管理）
const ESIM_DATA = [
  { 
    name: "KnowRoaming", 
    number: "+1 234 567 8900", 
    provider: "eSIM", 
    expireDate: "2026-06-15" // 格式必须为 YYYY-MM-DD
  },
  { 
    name: "Skinny", 
    number: "+64 123 4567", 
    provider: "Physical SIM", 
    expireDate: "2026-12-01" 
  },
  { 
    name: "Giffgaff", 
    number: "+44 7700 900077", 
    provider: "eSIM", 
    expireDate: "2026-08-20" 
  }
];

export default {
  // 1. 处理 HTTP 请求 (为 GitHub 上的前端提供数据 API)
  async fetch(request, env, ctx) {
    // 设置 CORS，允许 GitHub Pages 前端跨域请求
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    // 处理预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 返回 eSIM 列表 JSON 数据
    return new Response(JSON.stringify(ESIM_DATA), {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        ...corsHeaders
      }
    });
  },

  // 2. 处理定时任务 (Cron Trigger，用于触发 Telegram 提醒)
  async scheduled(event, env, ctx) {
    const today = new Date();
    // 强制转为东八区/北京时间进行对比 (可选，避免时区偏差)
    const offset = 8; 
    const localToday = new Date(today.getTime() + offset * 3600 * 1000);
    
    let messages = [];

    ESIM_DATA.forEach(sim => {
      const expDate = new Date(sim.expireDate);
      const diffTime = expDate - localToday;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 逻辑：当剩余天数小于等于 15 天，且尚未过期时，发送提醒
      if (diffDays <= 15 && diffDays > 0) {
        messages.push(
          `⚠️ 【eSIM 保号提醒】\n` +
          `📱 卡名: ${sim.name}\n` +
          `📞 号码: ${sim.number}\n` +
          `📅 到期: ${sim.expireDate}\n` +
          `⏳ 剩余: ${diffDays} 天！\n` +
          `👉 请尽快发短信或充值保号！`
        );
      } else if (diffDays === 0) {
        messages.push(`🚨 【eSIM 紧急提醒】\n📱 卡名: ${sim.name} 今天到期！请立即处理！`);
      } else if (diffDays < 0) {
        // 过期后的提醒，每隔 7 天提醒一次以防彻底忘记
        if (Math.abs(diffDays) % 7 === 0) {
           messages.push(`❌ 【eSIM 停机警告】\n📱 卡名: ${sim.name} (${sim.number}) 已过期 ${Math.abs(diffDays)} 天。`);
        }
      }
    });

    // 如果有需要发送的消息，则调用 Telegram API
    if (messages.length > 0) {
      const text = messages.join("\n\n---\n\n");
      const tgUrl = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`;
      
      await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TG_CHAT_ID,
          text: text,
          parse_mode: "HTML"
        })
      });
    }
  }
};
