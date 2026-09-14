// Проксі до Telegram Bot API — токен бере з env vars Netlify, у клієнтському коді його немає.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Bot not configured (env vars missing)' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { type, agentName, agent2Name, day, month, shiftLabel, shiftLabel2 } = payload;

  let text;
  if (type === 'offer') {
    text = `🔄 ${agentName} пропонує свою зміну (${shiftLabel}) на ${day} ${month}.\nХто хоче забрати — тисни в порталі на цю зміну в графіку команди.`;
  } else if (type === 'swap') {
    text = `✅ Обмін відбувся на ${day} ${month}:\n${agentName} тепер: ${shiftLabel}\n${agent2Name} тепер: ${shiftLabel2}`;
  } else {
    return { statusCode: 400, body: 'Unknown notification type' };
  }

  const body = { chat_id: chatId, text };
  const threadId = process.env.TELEGRAM_THREAD_ID;
  if (threadId) body.message_thread_id = Number(threadId); // конкретна гілка (тема) форум-групи

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!tgRes.ok) {
      const details = await tgRes.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Telegram error', details }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
