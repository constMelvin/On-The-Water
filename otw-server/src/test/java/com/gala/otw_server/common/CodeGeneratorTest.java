package com.gala.otw_server.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CodeGeneratorTest {

    @Test
    @DisplayName("generate produces 8 unambiguous characters")
    void generate() {
        String code = CodeGenerator.generate();
        assertThat(code).hasSize(8).matches("[A-HJ-NP-Z2-9]{8}");
    }

    @Test
    @DisplayName("normalize accepts how people actually type or paste a code")
    void normalize() {
        assertThat(CodeGenerator.normalize("7k2pabcd")).isEqualTo("7K2PABCD");
        assertThat(CodeGenerator.normalize(" 7K2P-ABCD ")).isEqualTo("7K2PABCD");
        assertThat(CodeGenerator.normalize("OTW-7K2P-ABCD")).isEqualTo("7K2PABCD");
        assertThat(CodeGenerator.normalize("otw 7k2p abcd")).isEqualTo("7K2PABCD");
        assertThat(CodeGenerator.normalize(null)).isEmpty();
        // An 8-char code that happens to start with OTW is left alone
        assertThat(CodeGenerator.normalize("OTWABCDE")).isEqualTo("OTWABCDE");
    }
}
