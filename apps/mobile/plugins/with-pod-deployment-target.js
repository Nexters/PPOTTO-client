// Xcode 27부터 iOS 15 미만 배포 타깃이 빌드 에러라, 오래된 타깃을 선언한 Pod들을 앱 최소 버전으로 끌어올린다.
const { withPodfile } = require('@expo/config-plugins');

const MARKER = '# with-pod-deployment-target';
const HOOK = 'post_install do |installer|\n';
const SNIPPET = `    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        if build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
`;

function withPodDeploymentTarget(config) {
  return withPodfile(config, (modConfig) => {
    const { contents } = modConfig.modResults;
    if (contents.includes(MARKER)) return modConfig;
    if (!contents.includes(HOOK)) throw new Error('Podfile post_install hook not found');

    modConfig.modResults.contents = contents.replace(HOOK, HOOK + SNIPPET);
    return modConfig;
  });
}

module.exports = withPodDeploymentTarget;
