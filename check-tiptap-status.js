const appId = '7me3n4g9';
const apiSecret = '458b85e220678adb6b97b8170fe5649358ddd524dabd421f8c8ef047754d2617';

// Tiptap Collab Cloud 提供的文档管理 API
// 根据您的要求，将 appId 填入 URL，并将 API Secret 作为 Bearer Token
const url = `https://${appId}.collab.tiptap.cloud/api/documents`;

async function checkTiptapStatus() {
  console.log(`正在请求 Tiptap API: ${url}...`);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': apiSecret,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`请求失败: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('错误详情:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Tiptap 文档状态获取成功！');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('请求发生异常:', error);
  }
}

checkTiptapStatus();
