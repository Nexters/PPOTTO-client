// Android 빌드 시 분석 결과 알림 채널을 고중요도로 생성하는 설정
const { withMainApplication } = require('@expo/config-plugins');

const CHANNEL_CALL = 'createAnalysisResultNotificationChannel()';
const CHANNEL_FUNCTION = `
  private fun createAnalysisResultNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val channel = NotificationChannel(
      "analysis-result",
      "분석 결과 알림",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "사진 분석 완료 및 실패 알림"
      enableVibration(true)
    }

    getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }

`;

function withAnalysisNotificationChannel(config) {
  return withMainApplication(config, (modConfig) => {
    if (modConfig.modResults.language !== 'kt') {
      throw new Error('Android MainApplication must use Kotlin');
    }

    let contents = modConfig.modResults.contents;

    if (!contents.includes('import android.app.NotificationChannel')) {
      contents = contents.replace(
        'import android.app.Application',
        [
          'import android.app.Application',
          'import android.app.NotificationChannel',
          'import android.app.NotificationManager',
          'import android.os.Build',
        ].join('\n'),
      );
    }

    if (!contents.includes(CHANNEL_CALL)) {
      contents = contents.replace(
        '    super.onCreate()\n',
        `    super.onCreate()\n    ${CHANNEL_CALL}\n`,
      );
    }

    if (!contents.includes('private fun createAnalysisResultNotificationChannel()')) {
      contents = contents.replace(
        '  override fun onConfigurationChanged',
        `${CHANNEL_FUNCTION}  override fun onConfigurationChanged`,
      );
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

module.exports = withAnalysisNotificationChannel;
