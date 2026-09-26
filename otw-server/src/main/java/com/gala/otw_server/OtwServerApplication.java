package com.gala.otw_server;

import com.gala.otw_server.config.DotenvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OtwServerApplication {

	public static void main(String[] args) {
		DotenvLoader.load();
		SpringApplication.run(OtwServerApplication.class, args);
	}

}

