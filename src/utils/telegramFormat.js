export const formatTelegramMessage = (data) => {
    const meta = data.meta || {};
    const m = data.markets || {};
    const sum = data.summary || "";
    return (
      `📊 *${meta.home_team} vs ${meta.away_team}*\n\n` +
      `${sum}\n\n` +
      `🏆 *Model Odds*\n` +
      `Home: ${(m["1x2"]?.home?.p * 100).toFixed(1)}% (${m["1x2"]?.home?.fair})\n` +
      `Draw: ${(m["1x2"]?.draw?.p * 100).toFixed(1)}% (${m["1x2"]?.draw?.fair})\n` +
      `Away: ${(m["1x2"]?.away?.p * 100).toFixed(1)}% (${m["1x2"]?.away?.fair})\n\n` +
      `O2.5: ${(m.over_2_5?.p * 100).toFixed(1)}%\nBTTS: ${(m.btts_yes?.p * 100).toFixed(1)}%\n\n` +
      `🔥 DM the bot for your next prediction\n#ValueBet #Edges`
    );
  };