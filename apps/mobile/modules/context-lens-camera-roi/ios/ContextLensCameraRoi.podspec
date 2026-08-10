Pod::Spec.new do |s|
  s.name = 'ContextLensCameraRoi'
  s.version = '1.0.0'
  s.summary = 'Native camera preview ROI conversion for Context Lens.'
  s.description = 'Converts a React Native camera view rectangle through AVCaptureVideoPreviewLayer.'
  s.homepage = 'https://github.com/arsiakhorramijam/context-lens'
  s.license = { :type => 'MIT' }
  s.authors = { 'Context Lens' => 'dev@contextlens.app' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.source = { :git => 'https://github.com/arsiakhorramijam/context-lens.git', :tag => s.version.to_s }
  s.source_files = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
