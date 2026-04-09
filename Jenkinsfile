pipeline {
    agent any

    environment {
        IMAGE_NAME = 'wa-bot-dispatcher'
        CONTAINER_NAME = 'wa-bot-dispatcher'
        HOST_PORT = '3014'
        // Anda juga harus menyalakan postgres terpisah atau gunakan cloud database (isi DB url di dalam file secret .env)
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Inject Secret Environment') {
            steps {
                // Pastikan Anda sudah membuat kredensial Jenkins bertipe "Secret File" dengan ID: 'wa-bot-env'
                withCredentials([file(credentialsId: 'wa-bot-env', variable: 'ENV_SECRET')]) {
                    // Inject file env hanya ke backend
                    sh 'cp $ENV_SECRET ./backend/.env'
                }
            }
        }

        stage('Build Unified Docker Image') {
            steps {
                // Proses build Docker multi-stage (Frontend & Backend dalam 1 tabung)
                sh "docker build -t ${IMAGE_NAME} ."
            }
        }

        stage('Deploy & Run Container') {
            steps {
                script {
                    // Menghentikan dan menghapus container lama jika ada
                    sh """
                    if [ "\$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
                        docker stop ${CONTAINER_NAME}
                        docker rm ${CONTAINER_NAME}
                    fi
                    """
                    
                    // Menjalankan container baru.
                    // - Port expose hanya 1: HOST_PORT (3014) di-mapping ke internal 3001 (Next.js server). 
                    // - Backend berjalan aman tersembunyi di port 3000 internal (proxy next.js menyalurkan traffic).
                    // - Folder session dipampang keluar (bind mount) agar auth bot konsisten walau diderive.
                    sh """
                    docker run -d \
                      --name ${CONTAINER_NAME} \
                      --restart always \
                      -p ${HOST_PORT}:3001 \
                      -v \$(pwd)/backend/auth_info_baileys:/app/backend/auth_info_baileys \
                      ${IMAGE_NAME}
                    """
                }
            }
        }
    }

    post {
        always {
            // Pembersihan security: hapus env rahasia setelah build/deploy beres agar tidak tertinggal di workspace Jenkins
            sh 'rm -f ./backend/.env'
            
            // Opsional: Membersihkan image layer yang ter-dangle/kedaluwarsa 
            sh 'docker image prune -f'
        }
    }
}
