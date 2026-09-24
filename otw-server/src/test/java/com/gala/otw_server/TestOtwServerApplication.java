package com.gala.otw_server;

import org.springframework.boot.SpringApplication;

public class TestOtwServerApplication {

	public static void main(String[] args) {
		SpringApplication.from(OtwServerApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
