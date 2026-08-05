const fs = require('fs');
const https = require('https');

// 取得當月日期範圍 (1號至15號)
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const startDate = `${year}-${month}-01`;
const endDate = `${year}-${month}-15`;

// 金管局 Open API 網址
const url = `https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/hkinterbank-offered-rates?segment=hibor&from=${startDate}&to=${endDate}`;

console.log('正在從香港金管局獲取最新 HIBOR 數據...');

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            if (parsedData.header && parsedData.header.success && parsedData.result.records.length > 0) {
                const records = parsedData.result.records;
                // 金管局數據第一筆紀錄 (按日期降序，最後一筆為當月首個工作日)
                const firstWorkDay = records[records.length - 1];
                const rate = parseFloat(firstWorkDay.ir_1m);
                const date = firstWorkDay.end_of_date;

                if (!isNaN(rate)) {
                    const roundedRate = Math.round(rate * 100) / 100;
                    console.log(`\n✅ 成功獲取數據！`);
                    console.log(`日期: ${date}`);
                    console.log(`1個月 HIBOR: ${roundedRate}%\n`);

                    // 1. 將數據寫入 hibor.json
                    const outputData = {
                        date: date,
                        rate: roundedRate,
                        updatedAt: new Date().toLocaleString()
                    };
                    fs.writeFileSync('hibor.json', JSON.stringify(outputData, null, 2), 'utf8');
                    console.log('📄 已更新 hibor.json');

                } else {
                    console.error('❌ 解析利率數值失敗。');
                }
            } else {
                console.error('❌ 未能獲取金管局數據紀錄。');
            }
        } catch (e) {
            console.error('❌ 解析 JSON 失敗:', e.message);
        }
    });
}).on('error', (e) => {
    console.error('❌ 連線至金管局 API 失敗:', e.message);
});
