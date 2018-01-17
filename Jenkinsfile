node {
  def project = 'badminton'
  def appName = 'badminton'
  def feSvcName = "${appName}-frontend"
  def imageTag = "zhangyanfa/badminton"

  checkout scm

  //stage 'Build image'
  //sh("docker build -t ${imageTag} .")

  //stage 'Run Go tests'
  //sh("docker run ${imageTag} go test")

  //stage 'Push image to registry'
  //sh("docker push ${imageTag}")

  
  sh("kubectl --namespace=icc-demo apply -f icp/")
  
}