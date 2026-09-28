const { withPodfile } = require("expo/config-plugins");

const MARKER = "Context Lens: normalize CocoaPods deployment targets for Xcode 27";

module.exports = function withPodDeploymentTarget(config, options = {}) {
  const deploymentTarget = options.deploymentTarget ?? "15.1";

  return withPodfile(config, (modConfig) => {
    const podfile = modConfig.modResults.contents;
    if (podfile.includes(MARKER)) return modConfig;

    const closingBlocks = "\n  end\nend";
    const insertionPoint = podfile.lastIndexOf(closingBlocks);
    if (insertionPoint === -1) {
      throw new Error("Unable to find the Expo Podfile post_install block.");
    }

    const deploymentTargetHook = `

    # ${MARKER}. Some resource-bundle targets retain the minimum from their
    # podspec even when the project-level platform is newer.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current_target = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current_target.nil? || Gem::Version.new(current_target) < Gem::Version.new('${deploymentTarget}')
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'
        end
      end
    end`;

    modConfig.modResults.contents =
      podfile.slice(0, insertionPoint) + deploymentTargetHook + podfile.slice(insertionPoint);
    return modConfig;
  });
};
