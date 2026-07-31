.PHONY: help install dev build start lint clean

APP_DIR := app
PACKAGE_MANAGER ?= npm

help: ## 查看可用命令
	@printf "North Food 本地开发命令\n\n"
	@printf "用法: make <target>\n\n"
	@awk 'BEGIN { FS = ":.*##" } /^[a-zA-Z0-9_-]+:.*##/ { printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## 安装前端依赖
	cd $(APP_DIR) && $(PACKAGE_MANAGER) install

dev: install ## 启动前端开发服务器
	cd $(APP_DIR) && $(PACKAGE_MANAGER) run dev

build: install ## 构建前端项目
	cd $(APP_DIR) && $(PACKAGE_MANAGER) run build

start: install ## 启动生产构建后的本地服务
	cd $(APP_DIR) && $(PACKAGE_MANAGER) run start

lint: install ## 运行前端 lint
	cd $(APP_DIR) && $(PACKAGE_MANAGER) run lint

clean: ## 清理前端构建产物
	cd $(APP_DIR) && rm -rf .next
